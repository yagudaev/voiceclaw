import Foundation
import MLX
import MLXUtilsLibrary

public enum VoiceEmbeddingLoader {
  // @_optimize(none) prevents the Swift compiler from inlining this function
  // into callers in other modules (e.g. ExpoCustomPipeline). Without this,
  // cross-module optimization creates a direct symbol reference to
  // MLXUtilsLibrary.NpyzReader in the calling module, which fails at link
  // time because MLXUtilsLibrary is only linked into KokoroSwift.framework.
  @_optimize(none)
  public static func loadVoices(from fileURL: URL) -> [String: MLXArray]? {
    NpyzReader.read(fileFromPath: fileURL)
  }

  @_optimize(none)
  public static func loadVoice(from fileURL: URL, key: String = "voice") -> MLXArray? {
    let weights = try? MLX.loadArrays(url: fileURL)
    if let voice = weights?[key] {
      return voice
    }
    return weights?.values.first
  }
}
