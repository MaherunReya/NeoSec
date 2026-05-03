import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Page {
    id: page
    anchors.centerIn: parent
    width: 1080
    height: 720

    property color primary: "#36e27b"
    property color background_dark: "#050505" 
    property color sidebar_bg: "#050505" 
    property color item_hover_bg: "#111111"
    property color text_light: "#ffffff"
    property color text_muted: "#444444"
    property color divider_color: "#1a1a1a"
    
    property string username: "User"
    property string role: "User"
    property string currentSelection: "dashboardBtn"

    background: Rectangle {
        color: background_dark
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.preferredWidth: 260
            Layout.fillHeight: true
            color: sidebar_bg
            
            Rectangle {
                anchors.right: parent.right
                anchors.top: parent.top
                anchors.bottom: parent.bottom
                width: 1
                color: divider_color
            }
            
            ColumnLayout {
                anchors.fill: parent
                spacing: 0
                
                Item {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 120
                    
                    Row {
                        anchors.centerIn: parent
                        spacing: 12
                        
                        Image {
                            source: "images/logo.png"
                            width: 28; height: 28
                            fillMode: Image.PreserveAspectFit
                            anchors.verticalCenter: parent.verticalCenter
                        }
                        Text {
                            text: "NEOSEC"
                            color: text_light
                            font { pixelSize: 20; weight: Font.Bold; family: "Inter"; letterSpacing: 2 }
                            anchors.verticalCenter: parent.verticalCenter
                        }
                    }
                }

                Column {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 8

                    Repeater {
                        model: [
                            { id: "dashboardBtn", text: "DASHBOARD", icon: "images/profile.png" },
                            { id: "vpnBtn", text: "VPN LINK", icon: "images/vpn.png" },
                            { id: "firewallBtn", text: "FIREWALL", icon: "images/firewall.png" }
                        ]
                        
                        delegate: Button {
                            id: navBtn
                            width: parent.width
                            height: 50
                            
                            property bool isActive: page.currentSelection === modelData.id
                            
                            background: Rectangle {
                                color: navBtn.hovered ? item_hover_bg : "transparent"
                                
                                Rectangle {
                                    width: 3
                                    height: 24
                                    color: primary
                                    visible: navBtn.isActive
                                    anchors.left: parent.left
                                    anchors.verticalCenter: parent.verticalCenter
                                    
                                    layer.enabled: navBtn.isActive
                                }
                            }

                            contentItem: Row {
                                spacing: 16
                                leftPadding: 40
                                anchors.verticalCenter: parent.verticalCenter
                                
                                Image {
                                    source: modelData.icon
                                    width: 18; height: 18
                                    fillMode: Image.PreserveAspectFit
                                    opacity: navBtn.isActive ? 1.0 : 0.5
                                    anchors.verticalCenter: parent.verticalCenter
                                }
                                
                                Text {
                                    text: modelData.text
                                    color: navBtn.isActive ? text_light : text_muted
                                    font { 
                                        pixelSize: 12 
                                        weight: Font.Bold 
                                        family: "Inter"
                                        letterSpacing: 1
                                    }
                                    anchors.verticalCenter: parent.verticalCenter
                                    
                                    layer.enabled: navBtn.isActive
                                }
                            }
                            
                            onClicked: {
                                page.currentSelection = modelData.id
                                if (modelData.id === "dashboardBtn") contentStack.replace(dashboardView)
                                else if (modelData.id === "vpnBtn") contentStack.replace(vpnView)
                                else if (modelData.id === "firewallBtn") contentStack.replace(firewallView)
                            }
                            
                            HoverHandler { cursorShape: Qt.PointingHandCursor }
                        }
                    }
                }
                
                Item {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 100
                    
                    Rectangle { 
                        height: 1; width: parent.width
                        color: divider_color
                        anchors.top: parent.top
                    }

                    RowLayout {
                        anchors.centerIn: parent
                        width: parent.width - 40
                        spacing: 12
                        
                        Rectangle {
                            width: 32; height: 32
                            radius: 16
                            color: "#111"
                            border.color: "#222"
                            
                            Text {
                                text: page.username.charAt(0).toUpperCase()
                                anchors.centerIn: parent
                                color: primary
                                font.weight: Font.Bold
                            }
                        }
                        
                        Column {
                            Layout.fillWidth: true
                            Text {
                                text: page.username
                                color: text_light
                                font { pixelSize: 12; weight: Font.Medium; family: "Inter" }
                                elide: Text.ElideRight
                                width: parent.width
                            }
                            Text {
                                text: page.role.toUpperCase()
                                color: text_muted
                                font { pixelSize: 10; weight: Font.Bold; family: "Inter" }
                            }
                        }
                        
                        Button {
                            Layout.preferredWidth: 28
                            Layout.preferredHeight: 28
                            
                            background: Rectangle {
                                color: parent.hovered ? "#222" : "transparent"
                                radius: 4
                            }
                            
                            contentItem: Text {
                                text: "→"
                                color: "#666" 
                                font.pixelSize: 16
                                anchors.centerIn: parent
                            }
                            
                            onClicked: backend.handleLogout()
                            HoverHandler { cursorShape: Qt.PointingHandCursor }
                        }
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: "transparent"
            
            StackView {
                id: contentStack
                anchors.fill: parent
                initialItem: dashboardView
                
                pushEnter: Transition { PropertyAnimation { property: "opacity"; from: 0; to: 1; duration: 150 } }
                pushExit: Transition { PropertyAnimation { property: "opacity"; from: 1; to: 0; duration: 150 } }
                replaceEnter: Transition { PropertyAnimation { property: "opacity"; from: 0; to: 1; duration: 150 } }
                replaceExit: Transition { PropertyAnimation { property: "opacity"; from: 1; to: 0; duration: 150 } }

                Component { id: dashboardView; Loader { source: "dashboard.qml" } }
                Component { id: vpnView; Loader { source: "vpn.qml" } }
                Component { id: firewallView; Loader { source: "firewall.qml" } }
            }
        }
    }
}
