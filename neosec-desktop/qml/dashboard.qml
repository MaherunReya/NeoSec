import QtQuick
import QtQuick.Controls

Item {
    id: root
    width: 780
    height: 720

    property var userProfile: null

    property var    profile:         userProfile ? userProfile.profile : null
    property var    user:            userProfile ? userProfile.user    : null
    property bool   vpnEnabled:      profile ? !!profile.vpnEnabled      : false
    property bool   firewallEnabled: profile ? !!profile.firewallEnabled  : true
    property string vpnProtocol:     profile ? (profile.vpnProtocol ?? "—") : "—"
    property string defaultAction:   profile ? (profile.defaultFirewallAction ?? "DENY") : "DENY"
    property int    vpnConfigCount:  userProfile ? (userProfile.vpnConfigs ? userProfile.vpnConfigs.length : 0) : 0
    property int    ruleCount: {
        if (!userProfile) return 0
        var r = userProfile.firewallRules
        return r ? r.length : 0
    }

    readonly property color bg:       "#121212"
    readonly property color card:     "#181818"
    readonly property color accent:   "#36e27b"
    readonly property color textLight:"#ffffff"
    readonly property color textMuted:"#b3b3b3"
    readonly property color offClr:   "#d32f2f"
    readonly property color warnClr:  "#f59e0b"

    Rectangle { anchors.fill: parent; color: bg }

    Column {
        anchors.centerIn: parent
        spacing: 24
        width: 600

        Text {
            text: "Dashboard"
            font.pixelSize: 28
            font.weight: Font.Bold
            color: textLight
            anchors.horizontalCenter: parent.horizontalCenter
        }

        // User info
        Rectangle {
            width: parent.width
            height: 70
            radius: 12
            color: card
            visible: user !== null

            Row {
                anchors.verticalCenter: parent.verticalCenter
                anchors.left: parent.left
                anchors.leftMargin: 24
                spacing: 16

                Rectangle {
                    width: 40; height: 40; radius: 20
                    color: accent
                    Text { anchors.centerIn: parent; text: "👤"; font.pixelSize: 18 }
                }

                Column {
                    spacing: 2
                    anchors.verticalCenter: parent.verticalCenter
                    Text {
                        text: user ? user.email : ""
                        font.pixelSize: 14
                        color: textLight
                        font.weight: Font.Medium
                    }
                    Text {
                        text: user ? (user.role + " · " + user.subscriptionTier) : ""
                        font.pixelSize: 11
                        color: textMuted
                    }
                }
            }
        }

        // Status cards row
        Row {
            spacing: 16
            width: parent.width

            // VPN card
            Rectangle {
                width: (parent.width - 16) / 2
                height: 160
                radius: 12
                color: card
                border.color: vpnEnabled ? accent : offClr
                border.width: 2

                Column {
                    anchors.centerIn: parent
                    spacing: 10

                    Rectangle {
                        width: 48; height: 48; radius: 24
                        color: vpnEnabled ? accent : offClr
                        anchors.horizontalCenter: parent.horizontalCenter
                        Text { anchors.centerIn: parent; text: vpnEnabled ? "ON" : "OFF"; font.pixelSize: 13; font.weight: Font.Bold; color: "white" }
                    }
                    Text {
                        text: "VPN"
                        font.pixelSize: 16; font.weight: Font.DemiBold
                        color: textLight
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                    Text {
                        text: vpnEnabled ? vpnProtocol : "Disconnected"
                        font.pixelSize: 11; color: textMuted
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                    Text {
                        text: vpnConfigCount + " config(s)"
                        font.pixelSize: 11; color: textMuted
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                }
            }

            // Firewall card
            Rectangle {
                width: (parent.width - 16) / 2
                height: 160
                radius: 12
                color: card
                border.color: firewallEnabled ? accent : offClr
                border.width: 2

                Column {
                    anchors.centerIn: parent
                    spacing: 10

                    Rectangle {
                        width: 48; height: 48; radius: 24
                        color: firewallEnabled ? accent : offClr
                        anchors.horizontalCenter: parent.horizontalCenter
                        Text { anchors.centerIn: parent; text: firewallEnabled ? "ON" : "OFF"; font.pixelSize: 13; font.weight: Font.Bold; color: "white" }
                    }
                    Text {
                        text: "Firewall"
                        font.pixelSize: 16; font.weight: Font.DemiBold
                        color: textLight
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                    Text {
                        text: "Default: " + defaultAction
                        font.pixelSize: 11
                        color: defaultAction === "DENY" ? warnClr : accent
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                    Text {
                        text: ruleCount + " rule(s)"
                        font.pixelSize: 11; color: textMuted
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                }
            }
        }

        // Profile info
        Rectangle {
            width: parent.width
            height: 70
            radius: 12
            color: card
            visible: profile !== null

            Row {
                anchors.verticalCenter: parent.verticalCenter
                anchors.left: parent.left
                anchors.leftMargin: 24
                spacing: 12

                Rectangle { width: 10; height: 10; radius: 5; color: accent; anchors.verticalCenter: parent.verticalCenter }
                Text {
                    text: "Active Profile: "
                    font.pixelSize: 13; color: textMuted
                    anchors.verticalCenter: parent.verticalCenter
                }
                Text {
                    text: profile ? (profile.name + "  [" + profile.profileType + "]") : ""
                    font.pixelSize: 13; font.weight: Font.Medium; color: textLight
                    anchors.verticalCenter: parent.verticalCenter
                }
            }
        }

        // Loading state
        Text {
            visible: userProfile === null
            text: "Connecting to server and loading profile…"
            font.pixelSize: 13; color: textMuted
            anchors.horizontalCenter: parent.horizontalCenter
        }
    }
}
