import sharp from 'sharp';

const SOURCE = 'assets/icon.svg';
const SIZES = [16, 48, 128];

await Promise.all(
  SIZES.map((size) =>
    sharp(SOURCE)
      .resize(size, size)
      .png()
      .toFile(`public/icons/icon-${String(size)}.png`),
  ),
);
