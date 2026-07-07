import Foundation

@MainActor
final class TasksViewModel: ObservableObject {
    @Published var tasks: [ArcoTask] = []
    @Published var newTaskTitle = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var serverURL: String

    private let api = ArcoAPI()
    private var pollTask: Task<Void, Never>?

    init() {
        serverURL = api.baseURL
        startPolling()
    }

    deinit {
        pollTask?.cancel()
    }

    var openTasks: [ArcoTask] {
        tasks.filter { task in
            !task.archived && task.status != "completed" && task.status != "cancelled"
        }
    }

    var menuBarLabel: String {
        let count = openTasks.count
        return count > 0 ? "✓ \(count)" : "✓"
    }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            tasks = try await api.listTasks()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func addTask() async {
        let title = newTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return }
        newTaskTitle = ""
        do {
            _ = try await api.createTask(title: title)
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func toggleComplete(_ task: ArcoTask) async {
        let completed = task.status != "completed"
        do {
            _ = try await api.completeTask(id: task.id, completed: completed)
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func delete(_ task: ArcoTask) async {
        do {
            try await api.deleteTask(id: task.id)
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func saveServerURL() {
        api.baseURL = serverURL
        Task { await refresh() }
    }

    private func startPolling() {
        pollTask = Task {
            while !Task.isCancelled {
                await refresh()
                try? await Task.sleep(nanoseconds: 15_000_000_000)
            }
        }
    }
}
