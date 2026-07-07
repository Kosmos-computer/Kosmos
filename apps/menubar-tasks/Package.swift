// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ArcoMenubarTasks",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "ArcoMenubarTasks", targets: ["ArcoMenubarTasks"]),
    ],
    targets: [
        .executableTarget(
            name: "ArcoMenubarTasks",
            path: "Sources"
        ),
    ]
)
