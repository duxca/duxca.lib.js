filename = "image2"

set key left box
set samples 50

plot "simple1.tsv" using 1:2

set terminal png
set out filename.".png"
replot

#set terminal postscript eps
#set out filename.".eps"
#replot
