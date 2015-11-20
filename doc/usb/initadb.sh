adb tcpip 5555
echo "imput android ip address"
read input_variable
adb connect $input_variable
adb logcat
