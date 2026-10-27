package com.example.webapptemplate;

import com.example.webapptemplate.platform.*;
import com.example.webapptemplate.settings.FeaturePolicy;
import com.example.webapptemplate.operations.internal.adapter.web.OperationsController;
import com.example.webapptemplate.operations.internal.adapter.persistence.RecoveryService;
import com.example.webapptemplate.platform.internal.adapter.web.WebSecurity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OperationsTests {
    @Test void databaseFailureAndMissingStorageAreDisplayedWithoutDiagnosticsLeaking() {
        var jdbc=mock(JdbcTemplate.class); when(jdbc.queryForObject("select current_schema()",String.class)).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("private-credential"));
        var storage=mock(ImageStore.class); var model=new ExtendedModelMap();
        var controller=new OperationsController(jdbc,storage,mock(ImageCleanup.class),new RuntimeInfo("local","app_template_test","Test DB","local"),mock(FeaturePolicy.class),AuditTrail.NONE,mock(RecoveryService.class),java.util.List.of());
        assertThat(controller.show(model)).isEqualTo("admin/operations");
        assertThat(model.get("checks").toString()).contains("接続失敗","未設定").doesNotContain("private-credential");
        assertThat(model.get("pending")).isEqualTo(-1);
    }
    @Test void disabledImagesAndOfflineStorageAreDifferentStates() {
        var jdbc=mock(JdbcTemplate.class); when(jdbc.queryForObject("select current_schema()",String.class)).thenReturn("app_template_test");
        var storage=mock(ImageStore.class); when(storage.configured()).thenReturn(true); doThrow(new IllegalStateException("private" )).when(storage).check();
        var model=new ExtendedModelMap();
        new OperationsController(jdbc,storage,mock(ImageCleanup.class),new RuntimeInfo("local","app_template_test","Test DB","local"),mock(FeaturePolicy.class),AuditTrail.NONE,mock(RecoveryService.class),java.util.List.of()).show(model);
        assertThat(model.get("checks").toString()).contains("禁止","接続失敗","正常").doesNotContain("private");
    }
    @Test void unprotectedPublicBindingAndProductionCannotStart() {
        var config=new WebSecurity();
        var env=new MockEnvironment().withProperty("server.address","0.0.0.0");
        assertThatThrownBy(()->config.security(mock(HttpSecurity.class),new RuntimeInfo("local","test","db","local"),env)).hasMessageContaining("Public binding");
        assertThatThrownBy(()->config.security(mock(HttpSecurity.class),new RuntimeInfo("production","test","db","local"),new MockEnvironment())).hasMessageContaining("Public binding");
        assertThatThrownBy(()->config.security(mock(HttpSecurity.class),new RuntimeInfo("production","test","db","basic"),new MockEnvironment())).hasMessageContaining("20 characters");
    }
}
