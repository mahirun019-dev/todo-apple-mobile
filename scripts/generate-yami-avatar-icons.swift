import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let sourceURL = root.appendingPathComponent("src/assets/brand/yami-brand-illustration.png")
let brandURL = root.appendingPathComponent("src/assets/brand", isDirectory: true)
let publicURL = root.appendingPathComponent("public", isDirectory: true)
try FileManager.default.createDirectory(at: publicURL, withIntermediateDirectories: true)

guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
      let crop = image.cropping(to: CGRect(x: 35, y: 12, width: 475, height: 475)) else {
  fatalError("Could not load the approved Yami brand illustration crop")
}

func pngData(size: Int, background: CGColor? = nil, insetFraction: CGFloat = 0) -> Data {
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
  guard let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4, space: colorSpace, bitmapInfo: bitmapInfo) else {
    fatalError("Could not create a (size)px icon canvas")
  }
  context.interpolationQuality = .high
  if let background {
    context.setFillColor(background)
    context.fill(CGRect(x: 0, y: 0, width: size, height: size))
  }
  let inset = CGFloat(size) * insetFraction
  let extent = CGFloat(size) - inset * 2
  context.draw(crop, in: CGRect(x: inset, y: inset, width: extent, height: extent))
  guard let rendered = context.makeImage() else { fatalError("Could not render a (size)px icon") }
  let data = NSMutableData()
  guard let destination = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else {
    fatalError("Could not encode a (size)px PNG")
  }
  CGImageDestinationAddImage(destination, rendered, nil)
  guard CGImageDestinationFinalize(destination) else { fatalError("Could not finish a (size)px PNG") }
  return data as Data
}

func write(_ data: Data, _ name: String) throws {
  try data.write(to: publicURL.appendingPathComponent(name), options: .atomic)
}

let favicon16 = pngData(size: 16)
let favicon32 = pngData(size: 32)
let favicon128 = pngData(size: 128)
try pngData(size: 512).write(to: brandURL.appendingPathComponent("yami-brand-avatar-core-512-v1.png"), options: .atomic)
try write(favicon16, "yami-favicon-avatar-16-v1.png")
try write(favicon32, "yami-favicon-avatar-32-v1.png")
try write(favicon128, "yami-favicon-avatar-128-v1.png")

let icoImages = [(16, favicon16), (32, favicon32)]
var ico = Data([0, 0, 1, 0, UInt8(icoImages.count), 0])
var offset = UInt32(6 + icoImages.count * 16)
for (size, data) in icoImages {
  ico.append(contentsOf: [UInt8(size), UInt8(size), 0, 0])
  var planes = UInt16(1).littleEndian
  var bitCount = UInt16(32).littleEndian
  var imageLength = UInt32(data.count).littleEndian
  var imageOffset = offset.littleEndian
  withUnsafeBytes(of: &planes) { ico.append(contentsOf: $0) }
  withUnsafeBytes(of: &bitCount) { ico.append(contentsOf: $0) }
  withUnsafeBytes(of: &imageLength) { ico.append(contentsOf: $0) }
  withUnsafeBytes(of: &imageOffset) { ico.append(contentsOf: $0) }
  offset += UInt32(data.count)
}
for (_, data) in icoImages { ico.append(data) }
try write(ico, "yami-favicon-avatar-v1.ico")
try write(ico, "favicon.ico")

let png64 = favicon128.base64EncodedString()
let svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\"><image width=\"128\" height=\"128\" href=\"data:image/png;base64,\(png64)\"/></svg>\n"
try write(Data(svg.utf8), "yami-favicon-avatar-v1.svg")

let appBackground = CGColor(red: 0, green: 0, blue: 0, alpha: 1)
let lightAppBackground = CGColor(red: 247 / 255, green: 247 / 255, blue: 245 / 255, alpha: 1)
let appIcons = [
  (180, "yami-app-icon-avatar-180-v1.png", 0.10),
  (192, "yami-app-icon-avatar-192-v1.png", 0.10),
  (512, "yami-app-icon-avatar-512-v1.png", 0.10),
  (512, "yami-app-icon-avatar-maskable-512-v1.png", 0.16),
]
for (size, name, inset) in appIcons {
  try write(pngData(size: size, background: appBackground, insetFraction: inset), name)
}

let lightAppIcons = [
  (180, "yami-app-icon-avatar-180-light-v1.png", 0.10),
  (192, "yami-app-icon-avatar-192-light-v1.png", 0.10),
  (512, "yami-app-icon-avatar-512-light-v1.png", 0.10),
  (512, "yami-app-icon-avatar-maskable-512-light-v1.png", 0.16),
]
for (size, name, inset) in lightAppIcons {
  try write(pngData(size: size, background: lightAppBackground, insetFraction: inset), name)
}

try write(pngData(size: 180, background: lightAppBackground, insetFraction: 0.10), "apple-touch-icon.png")
try write(pngData(size: 192, background: lightAppBackground, insetFraction: 0.10), "icon-192.png")
try write(pngData(size: 512, background: lightAppBackground, insetFraction: 0.10), "icon-512.png")
try write(pngData(size: 512, background: lightAppBackground, insetFraction: 0.16), "icon-maskable-512.png")

print("Generated transparent Yami avatar favicons, black app icons, and light-background app icons from the approved head illustration crop.")
