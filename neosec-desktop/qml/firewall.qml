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
                    text: "FIREWALL RULES"
                    font.pixelSize: 12
                    font.weight: Font.Bold
                    font.letterSpacing: 2
                    color: text_sec
                    Layout.alignment: Qt.AlignHCenter
                }
                
                Text {
                    text: firewall.activeRuleCount + " ACTIVE"
                    font.pixelSize: 32
                    font.weight: Font.Bold
                    font.family: "JetBrains Mono"
                    color: primary
                    Layout.alignment: Qt.AlignHCenter
                }
            }
             
            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width; height: 1
                color: Qt.rgba(primary.r, primary.g, primary.b, 0.2)
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 60
            color: "transparent"
            Layout.leftMargin: 40
            Layout.rightMargin: 40
            
            RowLayout {
                anchors.fill: parent
                spacing: 20
                
                // Search Field
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 40
                    color: "#1A1A1A"
                    radius: 4
                    border.color: searchInput.activeFocus ? primary : "#333"
                    border.width: 1
                    
                    TextInput {
                        id: searchInput
                        anchors.fill: parent
                        anchors.margins: 10
                        color: text_main
                        font.pixelSize: 14
                        font.family: "JetBrains Mono"
                        verticalAlignment: TextInput.AlignVCenter
                        selectByMouse: true
                        selectionColor: Qt.rgba(primary.r, primary.g, primary.b, 0.3)
                        
                        property string placeholderText: "Search IP or Port..."
                        
                        Text {
                            text: parent.placeholderText
                            color: "#666"
                            visible: !parent.text && !parent.activeFocus
                            anchors.verticalCenter: parent.verticalCenter
                            font: parent.font
                        }
                        
                        onTextChanged: firewall.set_filter_text(text)
                    }
                }
                
                // Filter Toggles
                RowLayout {
                    spacing: 0
                    
                    Repeater {
                        model: ["ALL", "ENABLED", "DISABLED"]
                        
                        delegate: Rectangle {
                            id: filterTab
                            width: 100
                            height: 40
                            color: selected ? Qt.rgba(primary.r, primary.g, primary.b, 0.1) : "#1A1A1A"
                            border.color: selected ? primary : "#333"
                            border.width: 1
                            
                            // Adjust corners for segmented look
                            radius: 4
                            
                            readonly property bool selected: currentFilter === modelData
                            property string currentFilter: "ALL" // Default
                            
                            // Sync with parent state or model
                            Connections {
                                target: filterRow
                                function onFilterChanged(newFilter) { filterTab.currentFilter = newFilter }
                            }
                            
                            Text {
                                anchors.centerIn: parent
                                text: modelData === "ENABLED" ? "ACTIVE" : (modelData === "DISABLED" ? "INACTIVE" : modelData)
                                color: parent.selected ? primary : "#666"
                                font.pixelSize: 12
                                font.weight: Font.Bold
                            }
                            
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    filterRow.filterChanged(modelData)
                                    firewall.set_filter_type(modelData)
                                }
                            }
                        }
                    }
                }
                
                Item {
                    id: filterRow
                    signal filterChanged(string filter)
                }
            }
        }

        ListView {
            id: ruleList
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 40
            clip: true
            spacing: 8
            model: firewall

            ScrollBar.vertical: ScrollBar {
                policy: ScrollBar.AsNeeded
                width: 4
                active: true
                contentItem: Rectangle { color: primary; radius: 2 }
                background: Rectangle { color: "transparent" }
            }

            delegate: Rectangle {
                id: delegateRoot
                width: ruleList.width
                height: 60
                radius: 4
                color: bg_card
                border.color: itemMouse.containsMouse ? primary : "transparent"
                border.width: 1

                Behavior on border.color { ColorAnimation { duration: 100 } }

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 20
                    anchors.rightMargin: 20
                    spacing: 20

                    Rectangle {
                        Layout.preferredWidth: 50
                        Layout.preferredHeight: 20
                        radius: 2
                        color: Qt.rgba(model.rule_action === "ALLOW" ? primary.r : danger.r, model.rule_action === "ALLOW" ? primary.g : danger.g, model.rule_action === "ALLOW" ? primary.b : danger.b, 0.1)
                        
                        Text {
                            anchors.centerIn: parent
                            text: model.rule_action
                            font.pixelSize: 10
                            font.weight: Font.Bold
                            color: model.rule_action === "ALLOW" ? primary : danger
                        }
                    }

                    Label {
                        text: model.ip_address
                        Layout.preferredWidth: 200
                        elide: Text.ElideRight
                        font.pixelSize: 14
                        font.family: "JetBrains Mono"
                        color: text_main
                    }
                    
                    Label {
                        text: "PORT " + (model.port_start === model.port_end ? model.port_start : model.port_start + "-" + model.port_end)
                        Layout.preferredWidth: 150
                        font.pixelSize: 12
                        font.family: "JetBrains Mono"
                        color: text_sec
                    }

                    Item {
                        Layout.fillWidth: true
                    }

                    Rectangle {
                        width: 36; height: 18
                        radius: 9
                        color: model.rule_enabled ? primary : "#333"
                        
                        Rectangle {
                            x: model.rule_enabled ? parent.width - width - 2 : 2
                            y: 2
                            width: 14; height: 14
                            radius: 7
                            color: "#000"
                            Behavior on x { NumberAnimation { duration: 150 } }
                        }
                    }
                }

                MouseArea {
                    id: itemMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    onClicked: firewall.toggle_selection(index)
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 80
            color: "transparent"
            
            Button {
                id: saveBtn
                anchors.centerIn: parent
                width: 180
                height: 40
                enabled: firewall.isDirty  

                contentItem: Text {
                    text: "APPLY RULES"
                    color: "#000000"
                    font.pixelSize: 12
                    font.weight: Font.Bold
                    font.letterSpacing: 1
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }

                background: Rectangle {
                    radius: 2
                    color: saveBtn.enabled ? primary : "#333"
                    opacity: saveBtn.enabled ? 1.0 : 0.5
                }
                
                onClicked: firewall.save_all()
                HoverHandler { cursorShape: Qt.PointingHandCursor }
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
