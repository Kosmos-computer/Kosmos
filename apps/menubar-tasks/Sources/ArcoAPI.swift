import Foundation

struct ArcoTask: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let description: String?
    let status: String
    let priority: String?
    let dueDateISO: String?
    let archived: Bool
}

struct CreateTaskBody: Encodable {
    let title: String
}

struct CompleteTaskBody: Encodable {
    let completed: Bool
}

enum ArcoAPIError: LocalizedError {
    case invalidURL
    case badStatus(Int, String)
    case decodeFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid server URL"
        case let .badStatus(code, body):
            return "Server error \(code): \(body)"
        case .decodeFailed:
            return "Could not read tasks from server"
        }
    }
}

@MainActor
final class ArcoAPI {
    static let defaultBaseURL = "http://127.0.0.1:4600"
    static let tokenFileURL: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return base.appendingPathComponent("ArcoMenubarTasks/session-token", isDirectory: false)
    }()

    var baseURL: String {
        didSet { UserDefaults.standard.set(baseURL, forKey: Self.baseURLKey) }
    }

    private static let baseURLKey = "arcoTasksBaseURL"

    init() {
        baseURL = UserDefaults.standard.string(forKey: Self.baseURLKey) ?? Self.defaultBaseURL
    }

    static func loadSessionToken() -> String? {
        if let env = ProcessInfo.processInfo.environment["ARCO_MENUBAR_TOKEN"], !env.isEmpty {
            return env
        }
        guard let data = try? Data(contentsOf: tokenFileURL),
              let token = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
              !token.isEmpty else {
            return nil
        }
        return token
    }

    static func saveSessionToken(_ token: String) throws {
        let dir = tokenFileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try token.write(to: tokenFileURL, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: tokenFileURL.path)
    }

    func listTasks() async throws -> [ArcoTask] {
        try await request(path: "/api/tasks", method: "GET")
    }

    func createTask(title: String) async throws -> ArcoTask {
        try await request(path: "/api/tasks", method: "POST", body: CreateTaskBody(title: title))
    }

    func completeTask(id: String, completed: Bool) async throws -> ArcoTask {
        try await request(
            path: "/api/tasks/\(id)/complete",
            method: "POST",
            body: CompleteTaskBody(completed: completed)
        )
    }

    func deleteTask(id: String) async throws {
        let _: DeleteResponse = try await request(path: "/api/tasks/\(id)", method: "DELETE")
    }

    private struct DeleteResponse: Decodable {
        let deleted: Bool
    }

    private func request<T: Decodable>(
        path: String,
        method: String,
        body: (any Encodable)? = nil
    ) async throws -> T {
        guard let url = URL(string: baseURL.trimmingCharacters(in: .whitespacesAndNewlines) + path) else {
            throw ArcoAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = Self.loadSessionToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw ArcoAPIError.badStatus(-1, "No response")
        }
        guard (200 ... 299).contains(http.statusCode) else {
            let text = String(data: data, encoding: .utf8) ?? ""
            throw ArcoAPIError.badStatus(http.statusCode, text)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw ArcoAPIError.decodeFailed
        }
    }
}

private struct AnyEncodable: Encodable {
    private let encode: (Encoder) throws -> Void

    init(_ wrapped: any Encodable) {
        encode = wrapped.encode
    }

    func encode(to encoder: Encoder) throws {
        try encode(encoder)
    }
}
