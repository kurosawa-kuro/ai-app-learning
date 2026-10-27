package com.example.webapptemplate.platform.internal.adapter.persistence;

import com.example.webapptemplate.platform.AuditTrail;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class JdbcAuditTrail implements AuditTrail {
    private final JdbcTemplate jdbc;
    public JdbcAuditTrail(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void record(String operation, String result, String reference) {
        var id = UUID.randomUUID();
        try {
            jdbc.update("insert into operation_events(id,operation,result,reference) values (?,?,?,?)",
                id, operation, result, reference);
        } catch (RuntimeException unavailable) {
            // Fixed operation codes and an opaque ID only, including when the DB is unavailable.
            System.getLogger(getClass().getName()).log(System.Logger.Level.WARNING,
                "Operation event {0}: {1} {2}", id, operation, result);
        }
    }
}
