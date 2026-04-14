// @ts-ignore – untyped internal module
import genMatrix from "react-native-qrcode-svg/src/genMatrix";
// @ts-ignore – untyped internal module
import transformMatrixIntoPath from "react-native-qrcode-svg/src/transformMatrixIntoPath";

/**
 * Generate a self-contained SVG string for a QR code.
 * Works on all platforms (no native modules needed).
 */
export function generateQrSvgString(
  value: string,
  size: number,
  fgColor = "#0f172a",
  bgColor = "#ffffff",
): string {
  const matrix: number[][] = genMatrix(value, "L");
  const moduleCount = matrix.length;
  const { path, cellSize } = transformMatrixIntoPath(matrix, moduleCount);
  const viewBox = moduleCount * cellSize;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}">
    <rect width="${viewBox}" height="${viewBox}" fill="${bgColor}" />
    <path d="${path}" stroke="${fgColor}" stroke-width="${cellSize}" fill="none" />
  </svg>`;
}

/**
 * Generate a data URI for embedding in HTML img tags or CSS.
 */
export function generateQrDataUri(
  value: string,
  size: number,
  fgColor = "#0f172a",
  bgColor = "#ffffff",
): string {
  const svg = generateQrSvgString(value, size, fgColor, bgColor);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}
