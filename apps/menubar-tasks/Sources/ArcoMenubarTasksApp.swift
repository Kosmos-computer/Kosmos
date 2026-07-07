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
            Text(model.menuBarLabel)
                .font(.system(size: 13, weight: .medium))
        }
        .menuBarExtraStyle(.window)
    }
}
