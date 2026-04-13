import Foundation
import MLX
import MLXUtilsLibrary

public enum VoiceEmbeddingLoader {
  public static func loadVoices(from fileURL: URL) -> [String: MLXArray]? {
    NpyzReader.read(fileFromPath: fileURL)
  }

  public static func loadVoice(from fileURL: URL, key: String = "voice") -> MLXArray? {
    let weights = try? MLX.loadArrays(url: fileURL)
    if let voice = weights?[key] {
      return voice
    }
    return weights?.values.first
  }
}
