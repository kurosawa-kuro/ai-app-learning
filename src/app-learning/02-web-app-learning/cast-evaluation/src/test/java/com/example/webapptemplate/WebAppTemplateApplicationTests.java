package com.example.webapptemplate;

import java.sql.SQLException;
import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class WebAppTemplateApplicationTests {

	@Autowired
	DataSource dataSource;

	@Test
	void contextLoads() {
	}

	@Test
	void databaseSupportsRoundTrip() throws SQLException {
		try (var connection = dataSource.getConnection()) {
			connection.setAutoCommit(false);
			try (var statement = connection.createStatement()) {
				try (var result = statement.executeQuery("select 1")) {
					assertThat(result.next()).isTrue();
					assertThat(result.getInt(1)).isEqualTo(1);
				}
				// pg_stat_ssl describes the pooler-to-DB connection, not this JDBC TLS session.
				statement.execute("create temporary table connection_probe (message text) on commit drop");
				try (var insert = connection.prepareStatement("insert into connection_probe values (?)")) {
					insert.setString(1, "DB接続確認");
					assertThat(insert.executeUpdate()).isEqualTo(1);
				}
				try (var result = statement.executeQuery("select message from connection_probe")) {
					assertThat(result.next()).isTrue();
					assertThat(result.getString(1)).isEqualTo("DB接続確認");
					assertThat(result.next()).isFalse();
				}
			} finally {
				// Roll back the temporary table and test data, including on assertion failure.
				connection.rollback();
			}
		}
	}

}
