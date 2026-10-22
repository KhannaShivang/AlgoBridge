import zlib
import struct
import os

def create_png(width, height, color_top, color_bottom):
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png += struct.pack('>I', 13) + b'IHDR' + ihdr + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr) & 0xFFFFFFFF)

    # IDAT chunk (pixel data)
    data = b''
    for y in range(height):
        # Filter type 0 (None)
        data += b'\x00'
        # Interpolate color between top and bottom
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * y / (height - 1)) if height > 1 else color_top[0]
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * y / (height - 1)) if height > 1 else color_top[1]
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * y / (height - 1)) if height > 1 else color_top[2]

        for x in range(width):
            # Draw a simple bracket/bridge icon [...] in the center
            is_bracket = False
            margin = width // 4
            thickness = max(1, width // 16)

            # Left bracket [
            if margin <= x < margin + thickness and margin <= y < height - margin:
                is_bracket = True
            if margin <= x < margin + width // 6 and (margin <= y < margin + thickness or height - margin - thickness <= y < height - margin):
                is_bracket = True

            # Right bracket ]
            if width - margin - thickness <= x < width - margin and margin <= y < height - margin:
                is_bracket = True
            if width - margin - width // 6 <= x < width - margin and (margin <= y < margin + thickness or height - margin - thickness <= y < height - margin):
                is_bracket = True

            if is_bracket:
                data += struct.pack('BBB', 255, 255, 255) # White icon
            else:
                data += struct.pack('BBB', r, g, b)

    compressed = zlib.compress(data)
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xFFFFFFFF)

    # IEND chunk
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND') & 0xFFFFFFFF)
    return png

# Ensure icons directory exists
os.makedirs('D:/AlgoBridge/icons', exist_ok=True)

# Generate 4 icon sizes
# Colors: GitHub-ish green gradient
color_top = (35, 134, 54) # #238636
color_bottom = (46, 160, 67) # #2ea043

for size in [16, 32, 48, 128]:
    with open(f'D:/AlgoBridge/icons/icon{size}.png', 'wb') as f:
        f.write(create_png(size, size, color_top, color_bottom))

print("Icons generated successfully in D:/AlgoBridge/icons/")
