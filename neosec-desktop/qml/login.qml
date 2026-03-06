import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Effects

Page {
    id: loginPage
    anchors.fill: parent
    
    property color primary: "#36e27b"
    property color background_dark: "#050505"
    property color text_main: "#ffffff"
    property color text_muted: "#444444"
    property color input_bg: "#111111"
    property color error_red: "#ff3333"
    property bool isLoading: true

    background: Rectangle {
        color: background_dark
    }

    ColumnLayout {
        anchors.centerIn: parent
        width: 400
        spacing: 40

        ColumnLayout {
            Layout.alignment: Qt.AlignHCenter
            spacing: 16
            
            Item {
                Layout.alignment: Qt.AlignHCenter
                Layout.preferredWidth: 64
                Layout.preferredHeight: 64
                
                Rectangle {
                    anchors.centerIn: parent
                    width: 60; height: 60
                    radius: 30
                    color: Qt.rgba(primary.r, primary.g, primary.b, 0.1)
                    border.color: Qt.rgba(primary.r, primary.g, primary.b, 0.3)
                    border.width: 1
                }
                
                Image {
                    source: "images/logo.svg"
                    width: 32; height: 32
                    sourceSize: Qt.size(64, 64)
                    smooth: true
                    antialiasing: true
                    anchors.centerIn: parent
                    fillMode: Image.PreserveAspectFit
                }
            }

            Text {
                text: "NEOSEC"
                color: text_main
                font.pixelSize: 24
                font.weight: Font.Black
                font.family: "Inter"
                font.letterSpacing: 4
                Layout.alignment: Qt.AlignHCenter
            }
            
            Text {
                text: "SECURITY CONTROL CENTER"
                color: text_muted
                font.pixelSize: 10
                font.weight: Font.Bold
                font.family: "Inter"
                font.letterSpacing: 2
                Layout.alignment: Qt.AlignHCenter
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 24
            
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8
                
                Text { 
                    text: "Email" 
                    color: text_muted 
                    font { pixelSize: 10; weight: Font.Bold; family: "Inter"; letterSpacing: 1 }
                }

                TextField {
                    id: loginUsernameField
                    Layout.fillWidth: true
                    Layout.preferredHeight: 50
                    placeholderText: "user@neosec.com"
                    color: text_main
                    font { pixelSize: 14; family: "JetBrains Mono" }
                    leftPadding: 16
                    enabled: !loginPage.isLoading
                    placeholderTextColor: "#333"

                    background: Rectangle {
                        color: input_bg
                        radius: 4
                        border.color: loginUsernameField.activeFocus ? primary : "#222"
                        border.width: 1
                        Behavior on border.color { ColorAnimation { duration: 150 } }
                        
                        Rectangle {
                            anchors.fill: parent
                            color: "transparent"
                            border.color: "#000"
                            border.width: 1
                            opacity: 0.5
                            radius: 4
                        }
                    }
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8
                
                Text { 
                    text: "Password" 
                    color: text_muted 
                    font { pixelSize: 10; weight: Font.Bold; family: "Inter"; letterSpacing: 1 }
                }

                TextField {
                    id: loginPasswordField
                    Layout.fillWidth: true
                    Layout.preferredHeight: 50
                    echoMode: TextInput.Password
                    placeholderText: "••••••••"
                    color: text_main
                    font { pixelSize: 14; family: "JetBrains Mono" }
                    leftPadding: 16
                    enabled: !loginPage.isLoading
                    placeholderTextColor: "#333"

                    background: Rectangle {
                        color: input_bg
                        radius: 4
                        border.color: loginPasswordField.activeFocus ? primary : "#222"
                        border.width: 1
                        Behavior on border.color { ColorAnimation { duration: 150 } }
                    }
                }
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 20
            
            Button {
                id: loginBtn
                Layout.fillWidth: true
                Layout.preferredHeight: 48
                enabled: !loginPage.isLoading
                
                contentItem: Text {
                    text: loginPage.isLoading ? "AUTHENTICATING..." : "LOGIN"
                    color: "#000000"
                    font.pixelSize: 12
                    font.weight: Font.Bold
                    font.family: "Inter"
                    font.letterSpacing: 1
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }

                background: Rectangle {
                    color: loginBtn.enabled ? (loginBtn.pressed ? Qt.darker(primary, 1.1) : primary) : "#222"
                    radius: 2
                    Behavior on color { ColorAnimation { duration: 150 } }
                    
                    layer.enabled: loginBtn.enabled && !loginBtn.pressed
                    layer.effect: MultiEffect {
                        shadowEnabled: true
                        shadowColor: Qt.rgba(primary.r, primary.g, primary.b, 0.4)
                        shadowBlur: 1.0
                    }
                }
                
                onClicked: {
                    loginPage.isLoading = true
                    backend.authenticate(loginUsernameField.text, loginPasswordField.text)
                }
                
                HoverHandler { cursorShape: Qt.PointingHandCursor }
            }
            
            Text {
                text: "NO ACCOUNT? SIGNUP"
                color: text_muted
                font { pixelSize: 10; weight: Font.Bold; family: "Inter" }
                Layout.alignment: Qt.AlignHCenter
                opacity: 0.5
                
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onEntered: parent.opacity = 1.0
                    onExited: parent.opacity = 0.5
                    onClicked: Qt.openUrlExternally(signup_url)
                }
            }
        }
        
        Text {
            id: errorLabel
            Layout.fillWidth: true
            horizontalAlignment: Text.AlignHCenter
            color: error_red
            font { bold: true; pixelSize: 12; family: "JetBrains Mono" }
            wrapMode: Text.WordWrap
            visible: text !== ""
        }
    }

    Connections {
        target: backend
        function onLoginFailed(message) { errorLabel.text = "[ERROR] " + message; loginPage.isLoading = false }
        function onAuthenticationFinished() { loginPage.isLoading = false }
    }
}
