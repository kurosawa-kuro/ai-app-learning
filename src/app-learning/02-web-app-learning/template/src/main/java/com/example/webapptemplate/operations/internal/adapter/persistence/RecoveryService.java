package com.example.webapptemplate.operations.internal.adapter.persistence;

import com.example.webapptemplate.platform.*;
import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.zip.*;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Portable application-data archive. Restore always targets a new isolated schema and new image keys. */
@Service
public class RecoveryService {
    private final List<String> TABLES;
    private final List<RecoveryDataset.Table> definitions;
    private final JdbcTemplate jdbc;
    private final DataSource source;
    private final ImageStore storage;
    private final TransactionTemplate snapshot;
    public RecoveryService(JdbcTemplate jdbc,DataSource source,ImageStore storage,PlatformTransactionManager transactions,RecoveryDataset dataset) {
        definitions=List.copyOf(dataset.tables());
        TABLES=definitions.stream().map(RecoveryDataset.Table::name).toList();
        this.jdbc=jdbc; this.source=source; this.storage=storage;
        snapshot=new TransactionTemplate(transactions);
        snapshot.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_REPEATABLE_READ);
        snapshot.setReadOnly(true);
    }
    public Path backup() {
        try {
            Path directory=Path.of(".local","backups").toAbsolutePath().normalize(); Files.createDirectories(directory);
            var file=directory.resolve("backup-"+System.currentTimeMillis()+"-"+UUID.randomUUID()+".zip");
            var partial=file.resolveSibling(file.getFileName()+".part");
            try {
                snapshot.executeWithoutResult(status -> {
                    try(var zip=new ZipOutputStream(Files.newOutputStream(partial,StandardOpenOption.CREATE_NEW))) {
                        var manifest=new Properties(); manifest.setProperty("format","2"); manifest.setProperty("tables",String.join(",",TABLES)); manifest.setProperty("created",Instant.now().toString());
                        manifest.setProperty("schema",jdbc.queryForObject("select current_schema()",String.class));
                        manifest.setProperty("migration",jdbc.queryForObject("select version from flyway_schema_history where success and version is not null order by installed_rank desc limit 1",String.class));
                        var tables=new LinkedHashMap<String,Properties>();
                        for(var table:TABLES) tables.put(table,readTable(table));
                        var refs=new LinkedHashMap<String,String[]>();
                        for(var table:definitions.stream().filter(RecoveryDataset.Table::images).map(RecoveryDataset.Table::name).toList()) {
                            var data=tables.get(table);
                            for(int row=0;row<Integer.parseInt(data.getProperty("rows"));row++) {
                                String bucket=data.getProperty(row+".image_bucket"),key=data.getProperty(row+".image_key");
                                if(key!=null) refs.putIfAbsent(bucket+"/"+key,new String[]{bucket,key,data.getProperty(row+".image_type")});
                            }
                        }
                        int index=0;
                        for(var ref:refs.values()) {
                            byte[] bytes=storage.download(ref[0],ref[1]);
                            if(bytes==null || bytes.length==0) throw new IllegalStateException("Missing backup image");
                            String prefix="image."+index+".";
                            manifest.setProperty(prefix+"bucket",ref[0]); manifest.setProperty(prefix+"key",ref[1]);
                            manifest.setProperty(prefix+"type",ref[2]); manifest.setProperty(prefix+"sha256",hash(bytes));
                            entry(zip,"images/"+index+".bin",bytes); index++;
                        }
                        manifest.setProperty("images",String.valueOf(index));
                        for(var table:TABLES) properties(zip,"tables/"+table+".xml",tables.get(table));
                        properties(zip,"manifest.xml",manifest);
                    } catch(IOException failure) { throw new UncheckedIOException(failure); }
                });
                Files.move(partial,file); return file;
            } catch(RuntimeException | IOException failure) { Files.deleteIfExists(partial); throw failure; }
        } catch(IOException failure) { throw new UncheckedIOException(failure); }
    }
    private Properties readTable(String table) {
        return jdbc.query("select * from "+table, rs -> {
            var data=new Properties(); var meta=rs.getMetaData(); int row=0;
            var columns=new ArrayList<String>();
            for(int c=1;c<=meta.getColumnCount();c++) columns.add(meta.getColumnName(c));
            data.setProperty("columns",String.join(",",columns));
            while(rs.next()) {
                for(int c=1;c<=meta.getColumnCount();c++) {
                    String value=rs.getString(c); if(value!=null) data.setProperty(row+"."+meta.getColumnName(c),value);
                }
                row++;
            }
            data.setProperty("rows",String.valueOf(row)); return data;
        });
    }
    public record Restored(String schema,int posts,int users,int images,String capturedAt,long milliseconds) {}
    public Restored restore(Path archive,String schema) {
        long started=System.nanoTime();
        if(!schema.matches("app_template_restore_[a-z0-9_]{1,30}")) throw new IllegalArgumentException("Use a new app_template_restore_* schema.");
        if(Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from information_schema.schemata where schema_name=?)",Boolean.class,schema)))
            throw new IllegalArgumentException("Restore target already exists; existing data is never overwritten.");
        var uploaded=new ArrayList<String>(); boolean committed=false;
        try(var zip=new ZipFile(archive.toFile())) {
            var manifest=load(zip,"manifest.xml");
            if(!"2".equals(manifest.getProperty("format")) || !String.join(",",TABLES).equals(manifest.getProperty("tables"))) throw new IllegalArgumentException("Unsupported backup format");
            String version=jdbc.queryForObject("select version from flyway_schema_history where success and version is not null order by installed_rank desc limit 1",String.class);
            if(!version.equals(manifest.getProperty("migration"))) throw new IllegalArgumentException("Backup migration version does not match this app.");
            var tables=new LinkedHashMap<String,Properties>();
            for(var table:TABLES) tables.put(table,load(zip,"tables/"+table+".xml"));
            int imageCount=Integer.parseInt(manifest.getProperty("images"));
            var replacements=new HashMap<String,String>();
            // Validate every archived file before creating a schema or uploading anything.
            for(int i=0;i<imageCount;i++) {
                if(!hash(bytes(zip,"images/"+i+".bin")).equals(manifest.getProperty("image."+i+".sha256"))) throw new IllegalArgumentException("Image checksum mismatch");
            }
            Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema).locations("classpath:db/migration").load().migrate();
            for(int i=0;i<imageCount;i++) {
                String prefix="image."+i+".",type=manifest.getProperty(prefix+"type");
                String key="restore-"+UUID.randomUUID()+(type.equals("image/jpeg")?".jpg":".png");
                uploaded.add(key); storage.upload(key,new ImageData(bytes(zip,"images/"+i+".bin"),type,type.equals("image/jpeg")?"jpg":"png"));
                // Read back the actual Storage object, not just the upload response.
                if(!hash(storage.download(storage.bucket(),key)).equals(manifest.getProperty(prefix+"sha256"))) throw new IllegalStateException("Restored image verification failed");
                replacements.put(manifest.getProperty(prefix+"bucket")+"/"+manifest.getProperty(prefix+"key"),key);
            }
            try(var connection=source.getConnection()) {
                connection.setAutoCommit(false);
                try {
                    connection.setSchema(schema);
                    for(var table:TABLES) {
                        // Retry state is quarantined in the archive, not activated against live bucket keys.
                        if(!restorable(table)) continue;
                        var data=tables.get(table);
                        for(int row=0;row<Integer.parseInt(data.getProperty("rows"));row++) {
                            String old=data.getProperty(row+".image_key");
                            if(old!=null) {
                                String key=replacements.get(data.getProperty(row+".image_bucket")+"/"+old);
                                if(key==null) throw new IllegalArgumentException("Image reference missing from archive");
                                data.setProperty(row+".image_key",key); data.setProperty(row+".image_bucket",storage.bucket());
                            }
                        }
                        insert(connection,schema,table,data);
                    }
                    // Verify row values and relationships inside the target before commit.
                    for(var table:TABLES) if(restorable(table)) verify(connection,schema,table,tables.get(table));
                    connection.commit(); committed=true;
                } catch(Exception failure) { connection.rollback(); throw failure; }
                finally { connection.setAutoCommit(true); }
            }
            return new Restored(schema,rows(tables,"posts"),rows(tables,"app_users"),imageCount,
                manifest.getProperty("created"),(System.nanoTime()-started)/1_000_000);
        } catch(Exception failure) { throw new IllegalStateException("Restore failed. Inspect the isolated target; the source is unchanged.",failure); }
        finally {
            if(!committed) for(var key:uploaded) {
                try { storage.delete(storage.bucket(),key); }
                catch(RuntimeException unavailable) { jdbc.update("insert into image_cleanup values (?,?) on conflict do nothing",storage.bucket(),key); }
            }
        }
    }
    private boolean restorable(String table) { return definitions.stream().anyMatch(t -> t.name().equals(table) && t.restore()); }
    private static int rows(Map<String,Properties> tables,String table) { return tables.containsKey(table)?Integer.parseInt(tables.get(table).getProperty("rows")):0; }
    private static void insert(Connection connection,String schema,String table,Properties data) throws SQLException {
        List<String> columns=List.of(data.getProperty("columns").split(","));
        var types=new HashMap<String,Integer>();
        try(var statement=connection.createStatement();var rs=statement.executeQuery("select * from "+schema+"."+table+" where false")) {
            var meta=rs.getMetaData(); for(int i=1;i<=meta.getColumnCount();i++) types.put(meta.getColumnName(i),meta.getColumnType(i));
        }
        if(!types.keySet().equals(new HashSet<>(columns))) throw new IllegalArgumentException("Table columns mismatch");
        String sql="insert into "+schema+"."+table+" ("+String.join(",",columns)+") values ("+String.join(",",Collections.nCopies(columns.size(),"?"))+")";
        try(var statement=connection.prepareStatement(sql)) {
            for(int row=0;row<Integer.parseInt(data.getProperty("rows"));row++) {
                for(int c=0;c<columns.size();c++) {
                    String value=data.getProperty(row+"."+columns.get(c)); int type=types.get(columns.get(c));
                    if(value==null) statement.setNull(c+1,type);
                    else statement.setObject(c+1,value,type);
                }
                statement.executeUpdate();
            }
        }
    }
    private static void verify(Connection connection,String schema,String table,Properties expected) throws SQLException {
        // Canonical JDBC strings make column-by-column comparisons independent of row order.
        var wanted=new HashSet<List<String>>(); var columns=List.of(expected.getProperty("columns").split(","));
        for(int row=0;row<Integer.parseInt(expected.getProperty("rows"));row++) {
            var values=new ArrayList<String>(); for(var column:columns) values.add(expected.getProperty(row+"."+column)); wanted.add(values);
        }
        var actual=new HashSet<List<String>>();
        try(var statement=connection.createStatement();var rs=statement.executeQuery("select * from "+schema+"."+table)) {
            while(rs.next()) { var values=new ArrayList<String>(); for(var column:columns) values.add(rs.getString(column)); actual.add(values); }
        }
        if(!wanted.equals(actual)) throw new IllegalStateException("Restored table verification failed: "+table);
    }
    private static String hash(byte[] value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value)); }
        catch(Exception impossible) { throw new IllegalStateException(impossible); }
    }
    private static void entry(ZipOutputStream zip,String name,byte[] value) throws IOException {
        zip.putNextEntry(new ZipEntry(name)); zip.write(value); zip.closeEntry();
    }
    private static void properties(ZipOutputStream zip,String name,Properties data) throws IOException {
        var output=new ByteArrayOutputStream(); data.storeToXML(output,"Application data; contains no connection credentials","UTF-8"); entry(zip,name,output.toByteArray());
    }
    private static byte[] bytes(ZipFile zip,String name) throws IOException {
        var entry=zip.getEntry(name); if(entry==null || entry.getSize()>32*1024*1024) throw new IllegalArgumentException("Invalid backup entry");
        try(var input=zip.getInputStream(entry)) {
            byte[] value=input.readNBytes(32*1024*1024+1); if(value.length>32*1024*1024) throw new IllegalArgumentException("Backup entry too large"); return value;
        }
    }
    private static Properties load(ZipFile zip,String name) throws IOException {
        var result=new Properties(); result.loadFromXML(new ByteArrayInputStream(bytes(zip,name))); return result;
    }
}
