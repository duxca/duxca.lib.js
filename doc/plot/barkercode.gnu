filename = "barkercode"

set key left box
#set samples 50

#set xlabel "time (sec)"
#set ylabel "power"

plot filename.".tsv" using 1:2 with lines notitle

set terminal png
set out filename.".png"
replot

plot filename.".tsv" using 1:2 with lines notitle

set terminal png
set out filename."All.png"
replot

#set terminal postscript eps
#set out filename.".eps"
#replot
