import QtQuick
import QtQuick.Controls

ApplicationWindow {
    id: root
    width: 1080
    height: 720
    visible: true
    color: "black"

    // Holds the parsed profile payload from the server socket
    property var userProfile: null

    Loader {
        id: pageLoader
        anchors.fill: parent
        source: "login.qml"
    }

    Connections {
        target: backend

        function onLoginSuccess(username) {
            pageLoader.source = "home.qml"
            pageLoader.item.username = username
        }

        function onLogout() {
            root.userProfile = null
            pageLoader.source = "login.qml"
        }

        // Receive full profile payload from Socket.IO auth_success
        function onProfileReceived(profileJson) {
            try {
                root.userProfile = JSON.parse(profileJson)
                // If home page is already loaded, push profile data into it
                if (pageLoader.item && typeof pageLoader.item.userProfile !== "undefined") {
                    pageLoader.item.userProfile = root.userProfile
                }
            } catch (e) {
                console.warn("Failed to parse profile JSON:", e)
            }
        }

        function onSocketError(msg) {
            console.warn("Socket error:", msg)
        }
    }
}
