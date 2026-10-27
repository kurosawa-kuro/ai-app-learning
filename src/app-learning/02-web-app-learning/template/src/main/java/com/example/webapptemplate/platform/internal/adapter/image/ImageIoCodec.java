package com.example.webapptemplate.platform.internal.adapter.image;
import com.example.webapptemplate.platform.ImageCodec;
import com.example.webapptemplate.platform.ImageData;
import com.example.webapptemplate.platform.ImageUpload;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;

@Component
public class ImageIoCodec implements ImageCodec {
    static final int MAX_BYTES = 5 * 1024 * 1024;

    public ImageData read(ImageUpload file) {
        if (file.bytes().length > MAX_BYTES) throw new IllegalArgumentException("画像は5MB以下にしてください。");
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(file.bytes()))) {
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
                return new ImageData(output.toByteArray(), "image/" + format, format.equals("jpeg") ? "jpg" : "png");
            } finally { reader.dispose(); }
        } catch (IOException e) {
            throw new IllegalArgumentException("画像を読み取れませんでした。別のJPEG・PNGで試してください。");
        }
    }
    public ImageData square(ImageData image) {
        try {
            var input = ImageIO.read(new ByteArrayInputStream(image.bytes()));
            int side = Math.min(input.getWidth(), input.getHeight());
            int x = (input.getWidth() - side) / 2, y = (input.getHeight() - side) / 2;
            var output = new BufferedImage(256, 256, BufferedImage.TYPE_INT_ARGB);
            var g = output.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.drawImage(input, 0, 0, 256, 256, x, y, x + side, y + side, null); g.dispose();
            var bytes = new ByteArrayOutputStream(); ImageIO.write(output, "png", bytes);
            return new ImageData(bytes.toByteArray(), "image/png", "png");
        } catch (IOException failure) { throw new IllegalArgumentException("アイコンを作成できませんでした。別の画像を選択してください。"); }
    }
}
