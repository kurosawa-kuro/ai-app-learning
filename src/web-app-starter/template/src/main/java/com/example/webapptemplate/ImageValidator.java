package com.example.webapptemplate;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
class ImageValidator {
    static final int MAX_BYTES = 5 * 1024 * 1024;
    record Image(byte[] bytes, String type, String extension) {}

    Image read(MultipartFile file) {
        if (file.getSize() > MAX_BYTES) throw new IllegalArgumentException("画像は5MB以下にしてください。");
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new IllegalArgumentException("JPEGまたはPNGの画像を選択してください。");
            var reader = readers.next();
            try {
                reader.setInput(input);
                var format = reader.getFormatName().toLowerCase(java.util.Locale.ROOT);
                if (!format.equals("jpeg") && !format.equals("png"))
                    throw new IllegalArgumentException("JPEGまたはPNGの画像を選択してください。");
                if ((long) reader.getWidth(0) * reader.getHeight(0) > 16_000_000)
                    throw new IllegalArgumentException("画像は1600万画素以下にしてください。");
                var image = reader.read(0);
                var output = new ByteArrayOutputStream();
                if (!ImageIO.write(image, format, output)) throw new IOException("Image encoding failed");
                if (output.size() > MAX_BYTES) throw new IllegalArgumentException("変換後の画像が5MBを超えました。画像を小さくしてください。");
                return new Image(output.toByteArray(), "image/" + format, format.equals("jpeg") ? "jpg" : "png");
            } finally { reader.dispose(); }
        } catch (IOException e) {
            throw new IllegalArgumentException("画像を読み取れませんでした。別のJPEG・PNGで試してください。");
        }
    }
}
