import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Effects

Rectangle {
    id: root
    width: 780
    height: 720
    color: "#050505"
    visible: true

    readonly property color primary: "#36e27b"
    readonly property color bg_card: "#111111"
    readonly property color text_main: "#ffffff"
    readonly property color text_sec: "#666666"
    readonly property color danger: "#d32f2f"
    readonly property color border_color: "#1a1a1a"

    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 120
            color: Qt.rgba(primary.r, primary.g, primary.b, 0.05)
            
            ColumnLayout {
                anchors.centerIn: parent
                spacing: 8
                
                Text {
                    text: "SECURE TUNNELS"
                    font.pixelSize: 12
                    font.weight: Font.Bold
                    font.letterSpacing: 2
                    color: text_sec
                    Layout.alignment: Qt.AlignHCenter
                }
                
                Text {
                    text: (vpnManager && vpnManager.hasActiveConnection) ? "TUNNEL ACTIVE" : "DISCONNECTED"
                    font.pixelSize: 32
                    font.weight: Font.Bold
                    font.family: "JetBrains Mono"
                    color: (vpnManager && vpnManager.hasActiveConnection) ? primary : text_sec
                    Layout.alignment: Qt.AlignHCenter
                }
            }
             
            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width; height: 1
                color: Qt.rgba(primary.r, primary.g, primary.b, 0.2)
            }
        }

        ListView {
            id: vpnList
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 40
            clip: true
            spacing: 8
            model: vpnManager ? vpnManager.configs : []

            ScrollBar.vertical: ScrollBar {
                policy: ScrollBar.AsNeeded
                width: 4
                active: true
                contentItem: Rectangle { color: primary; radius: 2 }
                background: Rectangle { color: "transparent" }
            }

            delegate: Rectangle {
                id: delegateRoot
                width: vpnList.width
                height: 60
                radius: 4
                color: bg_card
                border.color: model.modelData.active ? primary : (itemHover.hovered ? primary : "transparent")
                border.width: 1

                Behavior on border.color { ColorAnimation { duration: 150 } }

                HoverHandler {
                    id: itemHover
                }

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 20
                    anchors.rightMargin: 20
                    spacing: 20

                    Rectangle {
                        Layout.preferredWidth: 32
                        Layout.preferredHeight: 32
                        radius: 6
                        color: "#1a1a1a"
                        
                        Text {
                            anchors.centerIn: parent
                            text: model.modelData.type === "WireGuard" ? "WG" : "OV"
                            font.pixelSize: 10
                            font.weight: Font.Bold
                            color: model.modelData.type === "WireGuard" ? "#ffa726" : "#29b6f6"
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        
                        Text {
                            text: model.modelData.name
                            color: text_main
                            font.pixelSize: 14
                            font.weight: Font.Bold
                            font.family: "Inter"
                            Layout.fillWidth: true
                            elide: Text.ElideRight
                        }
                        
                        Text {
                            text: model.modelData.type + " Configuration"
                            color: text_sec
                            font.pixelSize: 12
                            font.family: "Inter"
                        }
                    }

                    Item {
                        width: 20
                    }

                    Button {
                        Layout.preferredWidth: 120
                        Layout.preferredHeight: 32
                        Layout.alignment: Qt.AlignRight | Qt.AlignVCenter
                        
                        background: Rectangle {
                            color: model.modelData.active ? Qt.rgba(danger.r, danger.g, danger.b, 0.1) : Qt.rgba(primary.r, primary.g, primary.b, 0.1)
                            radius: 4
                            border.color: model.modelData.active ? danger : primary
                            border.width: 1
                        }
                        
                        contentItem: Text {
                            text: model.modelData.active ? "DISCONNECT" : "CONNECT"
                            color: model.modelData.active ? danger : primary
                            font.pixelSize: 10
                            font.weight: Font.Bold
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                            elide: Text.ElideRight
                        }
                        
                        onClicked: vpnManager.toggleConnection(model.modelData.id)
                        HoverHandler { cursorShape: Qt.PointingHandCursor }
                    }

                    Button {
                        Layout.preferredWidth: 32
                        Layout.preferredHeight: 32
                        Layout.alignment: Qt.AlignRight | Qt.AlignVCenter
                        
                        background: Rectangle {
                            color: Qt.rgba(danger.r, danger.g, danger.b, 0.1)
                            radius: 4
                            border.color: danger
                            border.width: 1
                        }
                        
                        contentItem: Text {
                            text: "X"  
                            color: danger
                            font.pixelSize: 12
                            font.weight: Font.Bold
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        
                        onClicked: backend.deleteVpn(model.modelData.id)
                        HoverHandler { cursorShape: Qt.PointingHandCursor }
                    }
                }
            }
        }
        
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 60
            color: "transparent"
            
            Button {
                anchors.centerIn: parent
                text: "REFRESH CONFIGS"
                flat: true
                
                contentItem: Text {
                    text: parent.text
                    color: text_sec
                    font.pixelSize: 10
                    font.weight: Font.Bold
                    horizontalAlignment: Text.AlignHCenter
                }
                
                background: Rectangle { color: "transparent" }
                onClicked: backend.refreshData()
                HoverHandler { cursorShape: Qt.PointingHandCursor }
            }
        }
    }
}
