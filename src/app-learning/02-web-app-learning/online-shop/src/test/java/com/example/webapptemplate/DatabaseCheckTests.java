package com.example.webapptemplate;
import com.example.webapptemplate.settings.internal.adapter.web.DatabaseCheckController;
import javax.sql.DataSource;import java.sql.*;import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;import static org.assertj.core.api.Assertions.*;
class DatabaseCheckTests {
 @Test void checksOnlyWhenRequestedAndClosesResources() throws Exception {var source=mock(DataSource.class);var connection=mock(Connection.class);var statement=mock(Statement.class);var result=mock(ResultSet.class);when(source.getConnection()).thenReturn(connection);when(connection.createStatement()).thenReturn(statement);when(statement.executeQuery("select 1")).thenReturn(result);when(result.next()).thenReturn(true);when(result.getInt(1)).thenReturn(1);var controller=new DatabaseCheckController(source);verifyNoInteractions(source);assertThat(controller.check().getStatusCode().value()).isEqualTo(200);verify(statement).setQueryTimeout(3);verify(result).close();verify(statement).close();verify(connection).close();}
 @Test void failureDoesNotExposeConnectionDetails() throws Exception {var source=mock(DataSource.class);when(source.getConnection()).thenThrow(new SQLException("SECRET_CONNECTION"));var result=new DatabaseCheckController(source).check();assertThat(result.getStatusCode().value()).isEqualTo(503);assertThat(result.getBody().toString()).doesNotContain("SECRET_CONNECTION").contains("接続できませんでした");}
}
