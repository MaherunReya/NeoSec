import QtQuick
import QtQuick.Controls

Item {
    id: root
    width: 780
    height: 720

    // Populated by home.qml after socket auth_success
    property var userProfile: null

    // Derived helpers — read from profile, fall back gracefully
    property bool  vpnEnabled:  profile ? !!profile.vpnEnabled  : false
    property string vpnProtocol: profile ? (profile.vpnProtocol  ?? "—")  : "—"
    property string vpnServer:   profile ? (profile.vpnServer    ?? "—")  : "—"
    property int    vpnPort:     profile ? (profile.vpnPort      ?? 0)    : 0
    property string profileName: profile ? (profile.name         ?? "")   : ""

    property var    profile: userProfile ? userProfile.profile : null

    readonly property color bg:        "#121212"
    readonly property color card:      "#181818"
    readonly property color cardInner: "#232323"
    readonly property color accent:    "#36e27b"
    readonly property color textLight: "#ffffff"
    readonly property color textMuted: "#b3b3b3"
    readonly property color connectClr:"#36e27b"
    readonly property color disconnClr:"#d32f2f"

    Rectangle {
        anchors.fill: parent
        color: bg
    }

    Column {
        anchors.centerIn: parent
        spacing: 24
        width: 480

        // ── Header ─────────────────────────────────────────────
        Text {
            text: "VPN"
            font.pixelSize: 28
            font.weight: Font.Bold
            color: textLight
            anchors.horizontalCenter: parent.horizontalCenter
        }

        // ── Status card ────────────────────────────────────────
        Rectangle {
            width: parent.width
            height: 200
            radius: 12
            color: card
            border.color: vpnEnabled ? accent : "#444444"
            border.width: 2

            Column {
                anchors.centerIn: parent
                spacing: 12

                // Big status indicator
                Rectangle {
                    width: 64
                    height: 64
                    radius: 32
                    color: vpnEnabled ? accent : disconnClr
                    anchors.horizontalCenter: parent.horizontalCenter

                    Text {
                        anchors.centerIn: parent
                        text: vpnEnabled ? "ON" : "OFF"
                        font.pixelSize: 16
                        font.weight: Font.Bold
                        color: "#ffffff"
                    }
                }

                Text {
                    text: vpnEnabled ? "VPN Connected" : "VPN Disconnected"
                    font.pixelSize: 18
                    font.weight: Font.DemiBold
                    color: vpnEnabled ? accent : textMuted
                    anchors.horizontalCenter: parent.horizontalCenter
                }

                Text {
                    visible: profileName !== ""
                    text: "Profile: " + profileName
                    font.pixelSize: 12
                    color: textMuted
                    anchors.horizontalCenter: parent.horizontalCenter
                }
            }
        }

        // ── Details card ───────────────────────────────────────
        Rectangle {
            width: parent.width
            height: 120
            radius: 12
            color: card

            Column {
                anchors.verticalCenter: parent.verticalCenter
                anchors.left: parent.left
                anchors.leftMargin: 24
                spacing: 10

                Row {
                    spacing: 12
                    Text { text: "Protocol:";  font.pixelSize: 13; color: textMuted; width: 80 }
                    Text { text: vpnProtocol;  font.pixelSize: 13; color: textLight; font.weight: Font.Medium }
                }
                Row {
                    spacing: 12
                    Text { text: "Server:";    font.pixelSize: 13; color: textMuted; width: 80 }
                    Text { text: vpnServer;    font.pixelSize: 13; color: textLight; font.weight: Font.Medium; elide: Text.ElideRight; width: 280 }
                }
                Row {
                    spacing: 12
                    Text { text: "Port:";      font.pixelSize: 13; color: textMuted; width: 80 }
                    Text { text: vpnPort > 0 ? vpnPort.toString() : "—"; font.pixelSize: 13; color: textLight; font.weight: Font.Medium }
                }
            }
        }

        // ── Connect / Disconnect button ────────────────────────
        Button {
            width: parent.width
            height: 52
            enabled: root.profile !== null

            onClicked: {
                var newState = !root.vpnEnabled
                backend.toggleVpn(newState)
                // Optimistic local update
                if (root.profile) root.profile.vpnEnabled = newState
                root.vpnEnabled = newState
            }

            HoverHandler { cursorShape: Qt.PointingHandCursor }

            contentItem: Text {
                text: root.vpnEnabled ? "Disconnect VPN" : "Connect VPN"
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                font.pixelSize: 15
                font.weight: Font.DemiBold
                color: "#ffffff"
            }
            background: Rectangle {
                radius: 10
                color: root.vpnEnabled ? disconnClr : connectClr
                opacity: parent.enabled ? 1.0 : 0.4
                Behavior on color { ColorAnimation { duration: 200 } }
            }
        }

        // ── Not connected hint ─────────────────────────────────
        Text {
            visible: root.profile === null
            text: "Connecting to server…"
            font.pixelSize: 12
            color: textMuted
            anchors.horizontalCenter: parent.horizontalCenter
        }
    }
}
