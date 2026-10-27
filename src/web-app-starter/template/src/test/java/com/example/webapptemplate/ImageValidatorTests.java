package com.example.webapptemplate;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import static org.assertj.core.api.Assertions.*;

class ImageValidatorTests {
    private final ImageValidator validator = new ImageValidator();
    @Test
    void detectsContentRatherThanTrustingNameOrMimeType() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", output);
        var image = validator.read(new MockMultipartFile("image", "wrong.jpg", "text/plain", output.toByteArray()));
        assertThat(image.type()).isEqualTo("image/png");
        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(image.bytes())).getWidth()).isEqualTo(4);
    }
    @Test
    void rejectsFakeImageAndOversizeUpload() {
        assertThatThrownBy(() -> validator.read(new MockMultipartFile("image", "fake.png", "image/png", "not an image".getBytes())))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("JPEGまたはPNG");
        assertThatThrownBy(() -> validator.read(new MockMultipartFile("image", new byte[ImageValidator.MAX_BYTES + 1])))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("5MB");
    }
}
