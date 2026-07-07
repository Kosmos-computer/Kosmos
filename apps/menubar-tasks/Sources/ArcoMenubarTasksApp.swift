import SwiftUI

@main
struct ArcoMenubarTasksApp: App {
    @StateObject private var model = TasksViewModel()

    init() {
        NSApplication.shared.setActivationPolicy(.accessory)
    }

    var body: some Scene {
        MenuBarExtra {
            TasksMenuView(model: model)
        } label: {
            Label {
                Text("Arco Tasks")
            } icon: {
                Image(systemName: "checklist")
            }
            .labelStyle(.titleAndIcon)
        }
        .menuBarExtraStyle(.window)
    }
}
