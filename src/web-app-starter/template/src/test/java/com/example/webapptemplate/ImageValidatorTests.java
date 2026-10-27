package com.example.webapptemplate;

import com.example.webapptemplate.platform.ImageUpload;
import com.example.webapptemplate.platform.Uploads;
import com.example.webapptemplate.platform.internal.adapter.image.ImageIoCodec;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import static org.assertj.core.api.Assertions.*;

class ImageValidatorTests {
    private final ImageIoCodec validator = new ImageIoCodec();
    @Test
    void detectsContentRatherThanTrustingNameOrMimeType() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", output);
        var image = validator.read(Uploads.from(new MockMultipartFile("image", "wrong.jpg", "text/plain", output.toByteArray())));
        assertThat(image.type()).isEqualTo("image/png");
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(image.bytes())).getWidth()).isEqualTo(4);
    }
    @Test
    void rejectsFakeImageAndOversizeUpload() {
        assertThatThrownBy(() -> validator.read(new ImageUpload("not an image".getBytes())))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("JPEGまたはPNG");
        assertThatThrownBy(() -> validator.read(new ImageUpload(new byte[ImageUpload.MAX_BYTES + 1])))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("5MB");
    }
}
