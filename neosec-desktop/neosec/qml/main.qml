import QtQuick
import QtQuick.Controls

ApplicationWindow {
    id: root
    width: 1080
    height: 720
    visible: true
    title: "NeoSec Desktop"
    color: "#000000"

    property string sessionUsername: ""
    property string sessionRole: ""
    property string sessionToken: ""

    Loader {
        id: pageLoader
        anchors.fill: parent
        source: "login.qml"
        
        onStatusChanged: {
            if (status === Loader.Loading) {
            }
        }

        onLoaded: {
            if (source.toString().indexOf("home.qml") !== -1) {
                item.username = sessionUsername
                item.role = sessionRole
            }
        }
    }

    Connections {
        target: backend

        function onLoginSuccess(email, role, token) {
            sessionUsername = email
            sessionRole = role
            sessionToken = token
            
            backend.fetchRules(token)
            
            pageLoader.source = "home.qml"
        }

        function onLogout() {
            sessionUsername = ""
            sessionToken = ""
            pageLoader.source = "login.qml"
        }
    }
}
