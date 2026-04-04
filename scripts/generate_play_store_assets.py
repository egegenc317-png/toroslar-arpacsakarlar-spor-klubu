from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "play-store"


PALETTE = {
    "cream": "#FFF7E6",
    "warm_white": "#FFFDF7",
    "amber": "#F59E0B",
    "orange": "#F97316",
    "sun": "#FACC15",
    "peach": "#FED7AA",
    "ink": "#1F2937",
    "soft_ink": "#6B7280",
    "line": "#F2D7A6",
    "logo_top": "#F9A31A",
    "logo_bottom": "#F4A000",
    "logo_dot": "#FFE1A0",
}


def hex_rgb(value: str):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def load_font(size: int, bold: bool = False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def vertical_gradient(size, top, bottom):
    width, height = size
    image = Image.new("RGB", size, top)
    draw = ImageDraw.Draw(image)
    top_rgb = hex_rgb(top)
    bottom_rgb = hex_rgb(bottom)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(
            int(top_rgb[i] * (1 - ratio) + bottom_rgb[i] * ratio) for i in range(3)
        )
        draw.line((0, y, width, y), fill=color)
    return image


def draw_card_shadow(base: Image.Image, box, radius=36, offset=(0, 16), opacity=70):
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    ox, oy = offset
    draw.rounded_rectangle(
        (box[0] + ox, box[1] + oy, box[2] + ox, box[3] + oy),
        radius=radius,
        fill=(124, 45, 18, opacity),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(shadow)


def draw_brand_mark(draw: ImageDraw.ImageDraw, x, y, size, fill):
    unit = size / 100.0
    # Sun
    draw.ellipse((x + 74 * unit, y + 8 * unit, x + 90 * unit, y + 24 * unit), fill=fill)
    # Left building / store
    draw.rounded_rectangle(
        (x + 10 * unit, y + 38 * unit, x + 40 * unit, y + 72 * unit),
        radius=6 * unit,
        fill=fill,
    )
    # Right home block
    draw.rounded_rectangle(
        (x + 48 * unit, y + 36 * unit, x + 88 * unit, y + 72 * unit),
        radius=6 * unit,
        fill=fill,
    )
    draw.polygon(
        [
            (x + 44 * unit, y + 44 * unit),
            (x + 68 * unit, y + 18 * unit),
            (x + 92 * unit, y + 44 * unit),
        ],
        fill=fill,
    )
    # Awning
    draw.rectangle((x + 10 * unit, y + 34 * unit, x + 40 * unit, y + 44 * unit), fill=fill)
    # People
    draw.ellipse((x + 26 * unit, y + 42 * unit, x + 36 * unit, y + 52 * unit), fill=PALETTE["orange"])
    draw.ellipse((x + 36 * unit, y + 42 * unit, x + 46 * unit, y + 52 * unit), fill=PALETTE["orange"])
    draw.rounded_rectangle(
        (x + 22 * unit, y + 50 * unit, x + 40 * unit, y + 68 * unit),
        radius=6 * unit,
        fill=PALETTE["orange"],
    )
    draw.rounded_rectangle(
        (x + 34 * unit, y + 50 * unit, x + 52 * unit, y + 68 * unit),
        radius=6 * unit,
        fill=PALETTE["orange"],
    )


def add_dot_pattern(draw: ImageDraw.ImageDraw, width, height, spacing, color, alpha_step=18):
    rgba = hex_rgb(color)
    for y in range(spacing // 2, height, spacing):
        for x in range(spacing // 2, width, spacing):
            draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(*rgba, alpha_step))


def make_app_icon(size: int):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (size * 0.08, size * 0.1, size * 0.92, size * 0.94),
        radius=size * 0.2,
        fill=(180, 90, 0, 58),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.03))
    canvas.alpha_composite(shadow)

    inner_size = int(size * 0.84)
    bg = vertical_gradient(
        (inner_size, inner_size),
        PALETTE["logo_top"],
        PALETTE["logo_bottom"],
    ).convert("RGBA")
    mask = Image.new("L", (inner_size, inner_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        (0, 0, inner_size - 1, inner_size - 1),
        radius=int(inner_size * 0.22),
        fill=255,
    )
    inset = int(size * 0.08)
    canvas.alpha_composite(Image.composite(bg, Image.new("RGBA", bg.size, (0, 0, 0, 0)), mask), (inset, inset))

    draw = ImageDraw.Draw(canvas)
    x = inset
    y = inset
    unit = inner_size / 100.0
    white = (255, 255, 255, 255)

    # Top right pale dot
    dot = hex_rgb(PALETTE["logo_dot"]) + (255,)
    draw.ellipse(
        (
            x + 79 * unit,
            y + 8 * unit,
            x + 91 * unit,
            y + 20 * unit,
        ),
        fill=dot,
    )

    # Left shop body
    draw.rounded_rectangle(
        (
            x + 18 * unit,
            y + 41 * unit,
            x + 40 * unit,
            y + 64 * unit,
        ),
        radius=4 * unit,
        fill=white,
    )
    # Awning
    draw.rectangle((x + 18 * unit, y + 35 * unit, x + 40 * unit, y + 42 * unit), fill=white)
    # Awning cuts
    bg_orange = hex_rgb(PALETTE["logo_bottom"]) + (255,)
    for stripe in (22, 28, 34):
        draw.rectangle((x + stripe * unit, y + 35 * unit, x + (stripe + 1.8) * unit, y + 42 * unit), fill=bg_orange)

    # House body and roof
    draw.rounded_rectangle(
        (
            x + 46 * unit,
            y + 36 * unit,
            x + 78 * unit,
            y + 64 * unit,
        ),
        radius=4 * unit,
        fill=white,
    )
    draw.polygon(
        [
            (x + 43 * unit, y + 40 * unit),
            (x + 62 * unit, y + 24 * unit),
            (x + 81 * unit, y + 40 * unit),
        ],
        fill=white,
    )

    # Door cutout
    draw.rounded_rectangle(
        (
            x + 59 * unit,
            y + 49 * unit,
            x + 66 * unit,
            y + 64 * unit,
        ),
        radius=2 * unit,
        fill=bg_orange,
    )

    # People
    draw.ellipse((x + 33 * unit, y + 44 * unit, x + 40 * unit, y + 51 * unit), fill=white)
    draw.ellipse((x + 40 * unit, y + 44 * unit, x + 47 * unit, y + 51 * unit), fill=white)
    draw.rounded_rectangle(
        (
            x + 31 * unit,
            y + 50 * unit,
            x + 41 * unit,
            y + 64 * unit,
        ),
        radius=3 * unit,
        fill=white,
    )
    draw.rounded_rectangle(
        (
            x + 39 * unit,
            y + 50 * unit,
            x + 49 * unit,
            y + 64 * unit,
        ),
        radius=3 * unit,
        fill=white,
    )

    return canvas


def fit_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    *,
    bold: bool = False,
    max_size: int = 72,
    min_size: int = 44,
    max_width: int = 520,
):
    for size in range(max_size, min_size - 1, -2):
        font = load_font(size, bold=bold)
        bbox = draw.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            return font
    return load_font(min_size, bold=bold)


def make_feature_graphic():
    width, height = 1024, 500
    image = vertical_gradient((width, height), PALETTE["warm_white"], PALETTE["cream"]).convert("RGBA")
    draw = ImageDraw.Draw(image, "RGBA")

    # Soft atmosphere
    add_dot_pattern(draw, width, height, 28, PALETTE["line"], alpha_step=26)
    draw.ellipse((660, -40, 1020, 320), fill=hex_rgb(PALETTE["peach"]) + (80,))
    draw.ellipse((-120, 250, 240, 620), fill=hex_rgb(PALETTE["sun"]) + (42,))

    # Grid band at bottom
    for x in range(0, width, 28):
        draw.rectangle((x, height - 110, x + 14, height), fill=hex_rgb(PALETTE["sun"]) + (18,))

    # Left card
    panel_box = (58, 58, 378, 442)
    draw_card_shadow(image, panel_box, radius=42, offset=(0, 18), opacity=75)
    panel = Image.new("RGBA", image.size, (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle(panel_box, radius=42, fill=PALETTE["warm_white"])
    image.alpha_composite(panel)

    icon_size = 210
    icon = make_app_icon(icon_size).resize((icon_size, icon_size), Image.LANCZOS)
    image.alpha_composite(icon, (113, 105))

    draw = ImageDraw.Draw(image, "RGBA")

    title = "Dijital Mahallem"
    subtitle = "Sicak Mahalle Ruhu"
    body = "Mahallene ozel duyuru,\nilan, dukkan ve komsu sohbetleri"

    title_font = fit_text(draw, title, bold=True, max_size=72, min_size=44, max_width=520)
    subtitle_font = load_font(28, bold=True)
    body_font = load_font(30, bold=False)

    text_x = 430
    draw.text((text_x, 110), title, font=title_font, fill=PALETTE["ink"])
    draw.text((text_x, 190), subtitle, font=subtitle_font, fill="#9A3412")
    draw.text((text_x, 250), body, font=body_font, fill=PALETTE["soft_ink"], spacing=12)

    # Warm pill tags
    pill_font = load_font(22, bold=True)
    pills = ["Mahalle akisi", "Yerel pazar", "Kom su baglantisi".replace(" ", "")]
    pill_texts = ["Mahalle akisi", "Yerel pazar", "Komsu baglantisi"]
    pill_x = text_x
    pill_y = 360
    for pill in pill_texts:
        bbox = draw.textbbox((0, 0), pill, font=pill_font)
        pw = bbox[2] - bbox[0] + 34
        draw.rounded_rectangle((pill_x, pill_y, pill_x + pw, pill_y + 38), radius=19, fill=hex_rgb(PALETTE["cream"]) + (255,), outline=hex_rgb(PALETTE["line"]) + (255,), width=2)
        draw.text((pill_x + 17, pill_y + 7), pill, font=pill_font, fill="#B45309")
        pill_x += pw + 14

    return image


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    make_app_icon(1024).save(OUT_DIR / "app-icon-1024.png")
    make_app_icon(512).save(OUT_DIR / "app-icon-512.png")
    make_feature_graphic().save(OUT_DIR / "feature-graphic-1024x500.png")
    print(f"Assets generated in {OUT_DIR}")


if __name__ == "__main__":
    main()

