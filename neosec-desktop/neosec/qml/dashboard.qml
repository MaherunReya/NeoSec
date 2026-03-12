import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Effects

Item {
    id: root
    width: 780
    height: 720

    property real scaleFactor: Math.max(1.0, Math.min(width / 780, height / 720))

    readonly property color bg_main: "#050505"
    readonly property color primary: "#36e27b"
    readonly property color danger: "#ff3333"
    readonly property color text_main: "#ffffff"
    readonly property color text_dim: "#444444"
    readonly property color accent: "#111111"

    property string ipAddress: "Loading..."
    property string city: "..."
    property string country: "..."
    property string region: "..."
    property string isp: "Loading..."
    property string org: "..."
    property string timezone: "..."
    property string osName: "Loading..."
    
    property string downloadSpeed: "0 B/s"
    property string uploadSpeed: "0 B/s"
    
    property bool vpnConnected: false
    property string vpnStatus: vpnConnected ? "SYSTEM SECURED" : "UNPROTECTED"
    property color activeColor: vpnConnected ? primary : danger

    onVpnConnectedChanged: {
        dashboardBackend.fetchIpInfo()
    }

    Connections {
        target: dashboardBackend
        function onIpInfoReady(info) {
            root.ipAddress = info.query || "N/A"
            root.city = info.city || "N/A"
            root.country = info.country || "N/A"
            root.region = info.regionName || "N/A"
            root.isp = info.isp || "N/A"
            root.org = info.org || info.as || "N/A"
            root.timezone = info.timezone || "N/A"
            root.osName = info.os || "Linux"
        }
        function onNetworkSpeedUpdate(rx, tx) {
            root.downloadSpeed = rx
            root.uploadSpeed = tx
        }
        function onVpnStatusReady(status) {
            root.vpnConnected = status
        }
    }

    Component.onCompleted: {
        dashboardBackend.fetchIpInfo()
        dashboardBackend.startNetworkMonitor()
        dashboardBackend.checkVpnStatus()
        vpnTimer.start()
    }
    
    Component.onDestruction: {
        if (dashboardBackend) {
            dashboardBackend.stopNetworkMonitor()
        }
    }
    
    Timer {
        id: vpnTimer
        interval: 5000
        repeat: true
        onTriggered: dashboardBackend.checkVpnStatus()
    }

    Rectangle {
        anchors.fill: parent
        color: bg_main
        
        ColumnLayout {
            anchors.fill: parent
            spacing: 0
            
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 180 * scaleFactor
                color: Qt.rgba(root.activeColor.r, root.activeColor.g, root.activeColor.b, 0.08)
                
                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 10 * scaleFactor
                    
                    Text {
                        text: root.vpnStatus
                        font.pixelSize: 48 * scaleFactor
                        font.weight: Font.Black
                        font.family: "Inter"
                        font.letterSpacing: 2
                        color: root.activeColor
                        Layout.alignment: Qt.AlignHCenter
                    }
                    
                    Rectangle {
                        Layout.alignment: Qt.AlignHCenter
                        Layout.preferredWidth: 400 * scaleFactor
                        Layout.preferredHeight: 1
                        color: Qt.rgba(root.activeColor.r, root.activeColor.g, root.activeColor.b, 0.3)
                    }

                    Text {
                        text: root.ipAddress
                        font.pixelSize: 24 * scaleFactor
                        font.family: "JetBrains Mono"
                        font.bold: true
                        color: text_main
                        Layout.alignment: Qt.AlignHCenter
                    }
                }
                
                Rectangle {
                     anchors.bottom: parent.bottom
                     width: parent.width
                     height: 1
                     color: Qt.rgba(root.activeColor.r, root.activeColor.g, root.activeColor.b, 0.2)
                }
            }
            
            RowLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.margins: 50 * scaleFactor
                spacing: 60 * scaleFactor
                
                ColumnLayout {
                    Layout.fillHeight: true
                    Layout.preferredWidth: root.width * 0.35 
                    spacing: 30 * scaleFactor
                    
                    Text { 
                        text: "IDENTITY MATRIX" 
                        color: text_dim 
                        font.weight: Font.Bold 
                        font.pixelSize: 12 * scaleFactor
                        font.letterSpacing: 2
                    }
                    
                    Repeater {
                        model: [
                            { l: "ISP", v: root.isp },
                            { l: "LOCATION", v: root.city + ", " + root.country },
                            { l: "REGION", v: root.region },
                            { l: "ORG", v: root.org },
                            { l: "SYSTEM", v: root.osName },
                            { l: "TIMEZONE", v: root.timezone }
                        ]
                        
                        ColumnLayout {
                            spacing: 4 * scaleFactor
                            Text { 
                                text: modelData.l
                                color: "#666" 
                                font.pixelSize: 10 * scaleFactor 
                                font.family: "Inter"
                                font.weight: Font.Bold
                            }
                            Text { 
                                text: modelData.v
                                color: text_main 
                                font.pixelSize: 15 * scaleFactor
                                font.family: "JetBrains Mono"
                                Layout.fillWidth: true
                                elide: Text.ElideRight
                            }
                        }
                    }
                    
                    Item { Layout.fillHeight: true } 
                }
                
                ColumnLayout {
                    Layout.fillHeight: true
                    Layout.fillWidth: true
                    spacing: 40 * scaleFactor
                    
                    ColumnLayout {
                        spacing: 20 * scaleFactor
                        Text { 
                            text: "NETWORK TELEMETRY" 
                            color: text_dim 
                            font.weight: Font.Bold 
                            font.pixelSize: 12 * scaleFactor
                            font.letterSpacing: 2
                        }
                        
                        GridLayout {
                            columns: 2
                            columnSpacing: 40 * scaleFactor
                            rowSpacing: 10 * scaleFactor
                            
                            Text { text: "DOWN"; color: primary; font.weight: Font.Bold; font.pixelSize: 12 * scaleFactor }
                            Text { text: "UP"; color: "#ff5555"; font.weight: Font.Bold; font.pixelSize: 12 * scaleFactor }
                            
                            Text { 
                                text: root.downloadSpeed
                                color: text_main
                                font.pixelSize: 32 * scaleFactor
                                font.family: "JetBrains Mono"
                                Layout.preferredWidth: 160 * scaleFactor 
                                elide: Text.ElideRight
                            }
                            Text { 
                                text: root.uploadSpeed
                                color: text_main
                                font.pixelSize: 32 * scaleFactor
                                font.family: "JetBrains Mono"
                                Layout.preferredWidth: 160 * scaleFactor 
                                elide: Text.ElideRight
                            }
                        }
                        
                        // RowLayout {
                        //      Layout.fillWidth: true
                        //      spacing: 4
                        //      Repeater {
                        //          model: 20
                        //          Rectangle {
                        //              Layout.fillWidth: true
                        //              height: 4 * scaleFactor
                        //              color: index < 5 ? primary : "#1a1a1a" 
                        //          }
                        //      }
                        // }
                    }
                    
                    ColumnLayout {
                        spacing: 20 * scaleFactor
                         Text { 
                            text: "FIREWALL RULES" 
                            color: text_dim 
                            font.weight: Font.Bold 
                            font.pixelSize: 12 * scaleFactor
                            font.letterSpacing: 2
                        }
                        
                        RowLayout {
                            spacing: 20 * scaleFactor
                            Text {
                                text: firewall ? firewall.activeRuleCount : "0" 
                                font.pixelSize: 64 * scaleFactor
                                font.family: "JetBrains Mono"
                                font.bold: true
                                color: text_main
                            }
                            ColumnLayout {
                                Text { text: "ACTIVE"; color: primary; font.weight: Font.Bold; font.pixelSize: 14 * scaleFactor }
                                Text { text: "ENFORCED"; color: text_dim; font.pixelSize: 12 * scaleFactor }
                            }
                        }
                    }
                    
                    Item { Layout.fillHeight: true }
                }
            }
        }
    }
}
