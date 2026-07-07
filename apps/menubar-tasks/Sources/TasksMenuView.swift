import SwiftUI

struct TasksMenuView: View {
    @ObservedObject var model: TasksViewModel
    @FocusState private var addFieldFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Arco Tasks")
                    .font(.headline)
                Spacer()
                if model.isLoading {
                    ProgressView()
                        .controlSize(.small)
                }
                Button {
                    Task { await model.refresh() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .buttonStyle(.borderless)
                .help("Refresh")
            }

            HStack(spacing: 8) {
                TextField("Add a task…", text: $model.newTaskTitle)
                    .textFieldStyle(.roundedBorder)
                    .focused($addFieldFocused)
                    .onSubmit {
                        Task { await model.addTask() }
                    }
                Button("Add") {
                    Task { await model.addTask() }
                }
                .keyboardShortcut(.return, modifiers: .command)
                .disabled(model.newTaskTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            if let error = model.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if model.openTasks.isEmpty {
                Text("No open tasks")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 8)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 4) {
                        ForEach(model.openTasks) { task in
                            TaskRow(task: task, model: model)
                        }
                    }
                }
                .frame(maxHeight: 280)
            }

            Divider()

            HStack {
                TextField("Server", text: $model.serverURL)
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                Button("Save") {
                    model.saveServerURL()
                }
                .font(.caption)
            }

            HStack {
                Button("Open Arco") {
                    if let url = URL(string: model.serverURL) {
                        NSWorkspace.shared.open(url)
                    }
                }
                Spacer()
                Button("Quit") {
                    NSApplication.shared.terminate(nil)
                }
            }
            .font(.caption)
        }
        .padding(12)
        .frame(width: 320)
        .onAppear {
            addFieldFocused = true
            Task { await model.refresh() }
        }
    }
}

private struct TaskRow: View {
    let task: ArcoTask
    @ObservedObject var model: TasksViewModel

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Button {
                Task { await model.toggleComplete(task) }
            } label: {
                Image(systemName: task.status == "completed" ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(task.status == "in_progress" ? .orange : .secondary)
            }
            .buttonStyle(.borderless)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .lineLimit(2)
                if let due = task.dueDateISO {
                    Text(due)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer(minLength: 0)

            Button {
                Task { await model.delete(task) }
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.borderless)
            .help("Delete")
        }
        .padding(.vertical, 2)
    }
}
