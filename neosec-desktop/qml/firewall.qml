import QtQuick
import QtQuick.Controls

Item {
    id: root
    width: 780
    height: 720

    // Populated by home.qml after socket auth_success
    property var userProfile: null

    property var    profile:           userProfile ? userProfile.profile : null
    property bool   firewallEnabled:   profile ? !!profile.firewallEnabled : true
    property string defaultAction:     profile ? (profile.defaultFirewallAction ?? "DENY") : "DENY"
    property int    ruleCount:         {
        if (!profile) return 0
        var rules = profile.firewallRules
        if (!rules) return 0
        // firewallRules can be a JSON array stored in profile, or use top-level firewallRules
        if (Array.isArray(rules)) return rules.length
        return 0
    }
    // Also consider top-level firewallRules list from VPN config query
    property int    extraRules: {
        if (!userProfile) return 0
        var r = userProfile.firewallRules
        return r ? r.length : 0
    }
    property int    totalRules: ruleCount > 0 ? ruleCount : extraRules
    property string profileName: profile ? (profile.name ?? "") : ""

    readonly property color bg:        "#121212"
    readonly property color card:      "#181818"
    readonly property color textLight: "#ffffff"
    readonly property color textMuted: "#b3b3b3"
    readonly property color accent:    "#36e27b"
    readonly property color warnClr:   "#f59e0b"
    readonly property color disabledClr:"#d32f2f"

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
            text: "Firewall"
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
            color: "#181818"
            border.color: firewallEnabled ? accent : disabledClr
            border.width: 2

            Column {
                anchors.centerIn: parent
                spacing: 12

                Rectangle {
                    width: 64
                    height: 64
                    radius: 32
                    color: firewallEnabled ? accent : disabledClr
                    anchors.horizontalCenter: parent.horizontalCenter

                    Text {
                        anchors.centerIn: parent
                        text: firewallEnabled ? "ON" : "OFF"
                        font.pixelSize: 16
                        font.weight: Font.Bold
                        color: "#ffffff"
                    }
                }

                Text {
                    text: firewallEnabled ? "Firewall Active" : "Firewall Disabled"
                    font.pixelSize: 18
                    font.weight: Font.DemiBold
                    color: firewallEnabled ? accent : disabledClr
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
            height: 90
            radius: 12
            color: "#181818"

            Column {
                anchors.verticalCenter: parent.verticalCenter
                anchors.left: parent.left
                anchors.leftMargin: 24
                spacing: 10

                Row {
                    spacing: 12
                    Text { text: "Default action:"; font.pixelSize: 13; color: textMuted; width: 120 }
                    Text {
                        text: defaultAction
                        font.pixelSize: 13
                        font.weight: Font.Medium
                        color: defaultAction === "DENY" ? warnClr : accent
                    }
                }
                Row {
                    spacing: 12
                    Text { text: "Active rules:";   font.pixelSize: 13; color: textMuted; width: 120 }
                    Text { text: totalRules.toString(); font.pixelSize: 13; color: textLight; font.weight: Font.Medium }
                }
            }
        }

        // ── Enable / Disable button ────────────────────────────
        Button {
            width: parent.width
            height: 52
            enabled: root.profile !== null

            onClicked: {
                var newState = !root.firewallEnabled
                backend.toggleFirewall(newState)
                // Optimistic local update
                if (root.profile) root.profile.firewallEnabled = newState
                root.firewallEnabled = newState
            }

            HoverHandler { cursorShape: Qt.PointingHandCursor }

            contentItem: Text {
                text: root.firewallEnabled ? "Disable Firewall" : "Enable Firewall"
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                font.pixelSize: 15
                font.weight: Font.DemiBold
                color: "#ffffff"
            }
            background: Rectangle {
                radius: 10
                color: root.firewallEnabled ? disabledClr : accent
                opacity: parent.enabled ? 1.0 : 0.4
                Behavior on color { ColorAnimation { duration: 200 } }
            }
        }

        Text {
            visible: root.profile === null
            text: "Connecting to server…"
            font.pixelSize: 12
            color: textMuted
            anchors.horizontalCenter: parent.horizontalCenter
        }
    }
}
