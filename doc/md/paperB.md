# 複数の携帯端末による教室空間の空間音響環境構築手法の検討


# 概要
<!--
めうちゃんは〜がしたいんだよね（背景・目的）
したいめう
だけど今は〜（先行研究）
めう…
そこで〜をする（提案手法）
するめう
すると〜（結果）
やっためうすごいめう
-->
個人が所有するスマートデバイスを用いて
空間音響を構築し相互の位置に応じた音による
情報提供を行うシステムを開発した。
空間音響を構築するには、複数のスマートデバイスのスピーカの同期的な制御が必要である。
そのため、スマートデバイスのマイクロホンとスピーカを利用し、
同期に音声信号を用いて、デバイス間の同期をする手法を用いた。
また、空間音響を構築するには、スマートデバイス間の相対位置を知る必要がある。
そのため、スマートデバイスのマイクロフォンとスピーカを利用し、
音の到達時刻差による端末間の相対位置を推定する手法を用いた。
その結果、人々の持つスマートデバイスを用いた空間音響が構築でき、
その相対位置に応じた、音による注意喚起ができた。
これにより、人々の相互の位置や距離に応じた音による情報提供が可能であることが分かった。


# 序論
<!-- 緒論，，どのくらいかくのかな
     ２ページとか？？４ページとか？？-->
近年、センサネットワーク(Wireless Sensor Networks, WSN)の研究が盛んに行われるようになった。
センサネットワークは、
  クラウドコンピューティング(cloud computing)と共に、
  モノのインターネット(Internet of Things、IoT)の中核をなす技術である。
センサネットワークとは、
  人間が居住する空間にセンサを多数配置し、
  人間や、その空間の環境・状態をセンシングし、
  そのデータをインターネットを通じてクラウドサービスに蓄え、
  その膨大なデータをクラウドコンピューティング資源で統計的に調査することで、
  人間やその空間自体の文脈に応じた情報を自動的に得ることができる技術である\cite{Akyildiz}。
```
\bibitem{Akyildiz}
Akyildiz, Ian F., and Ismail H. Kasimoglu.
"Wireless sensor and actor networks: research challenges."
Ad hoc networks 2.4 (2004): 351-367.
```
モノのインターネットとは、
  空間に配置したあらゆるモノが
  インターネットに接続することで、
  センサ情報を取得するだけでなく、
  その空間にクラウドからインターネットを介して直接働きかけることができるようになる技術である\cite{Ashton}。
```
\bibitem{Ashton}
Ashton, Kevin.
"That ‘internet of things’ thing."
RFiD Journal 22.7 (2009): 97-114.
```
たとえば、
  インターネットとつながったエアコンならば、
  クラウド資源が主人の帰宅をスマートフォンなどのスマートデバイスによってセンシングされた情報を通じて検知し、
  帰宅直後に最適な温度になるような最適な時間にエアコンが点くようにインターネットを介して制御することで、
  電力の節約と快適な室内環境を両立できるようになる。
また、主人の部屋のベッドや腕時計などセンサを持ちインターネットのクラウド資源とつながることで、
  睡眠時間や眠りの深さなどをクラウド資源に報告することで、
  明日のスケジュールに合わせて最適な時間に心地よく起きられる時間に目覚まし時計を設定したり、
  健康状態をモニタリングして、運動量に基づいた薬の調合などを計算したりできる\cite{Petriu?}。
```
\bibitem{Petriu}
Petriu, Emil M., et al.
"Sensor-based information appliances."
Instrumentation & Measurement Magazine, IEEE 3.4 (2000): 31-35.
```

IoTやセンサネットワークとって、そのセンサが屋内の「どの位置に配置されているかは」非常に大きな関心である。
大量のセンサの配置がわからなければ、そのデータから得られる情報が少ないからである。
野外であればGPSを用いて正確な位置がわかるが、今まで屋内において正確な位置を測位することが困難であった。
こうした屋内測位の需要の高まりを受けて、屋内においても測位システムを導入すべく、研究が盛んに行われている
\cite[etc.]{Patwari,Whistle,Bertrand,Akyildiz2}。
```
\bibitem{Patwari}
Patwari, Neal, et al.
"Locating the nodes: cooperative localization in wireless sensor networks."
Signal Processing Magazine, IEEE 22.4 (2005): 54-69.
```
```
\bibitem{Whistle}
Xu, Bin, et al.
"Whistle: Synchronization-free tdoa for localization."
Distributed Computing Systems (ICDCS), 2011 31st International Conference on. IEEE, 2011.
```
```
\bibitem{Bertrand}
Bertrand, Alexander.
"Applications and trends in wireless acoustic sensor networks: a signal processing perspective."
Communications and Vehicular Technology in the Benelux (SCVT), 2011 18th IEEE Symposium on. IEEE, 2011.
```
```
\bibitem{Akyildiz2}
Akyildiz, Ian F., et al.
"A survey on sensor networks."
Communications magazine, IEEE 40.8 (2002): 102-114.
```

そして、身近にあるスマートフォンなどのスマートデバイスを用いてセンサネットワークを構築し、位置測位する技術も研究されてきた\cite[etc.]{Hache,Janson}。
```
\bibitem{Hache}
Hache, G., E. D. Lemaire, and N. Baddour.
"Mobility change-of-state detection using a smartphone-based approach.
Medical Measurements and Applications Proceedings (MeMeA)."
2010 IEEE International Workshop on April. Vol. 30. 2010.
```
```
\bibitem{Janson}
Janson, Thomas, Christian Schindelhauer, and Johannes Wendeberg.
"Self-localization application for iphone using only ambient sound signals."
Indoor Positioning and Indoor Navigation (IPIN), 2010 International Conference on. IEEE, 2010.
```

![iphone](iphone.png)

このような通信可能なスマートデバイスのスピーカやマイクロホンを使うことで
  アドホックマイクロホンアレイ(ad-hoc microphone array)\cite{小野順貴}を構築し、
  音源分離や音源位置推定などを行うシステムは、
  ワイヤレスアコースティックセンサネットワーク(wireless acoustic sensor networks)\cite{Keewook}と呼ばれ、
  現在盛んに研究されている。
![アドホックマイクロホンアレイ](adhocmicrophonearray.png)
```
\bibitem{小野順貴}
小野順貴, et al.
"アドホックマイクロホンアレー."
IEICE ESS Fundamentals Review 7.4 (2014): 336-347.
```
```
\bibitem{Keewook}
Na, Keewook, Yungeun Kim, and Hojung Cha.
"Acoustic sensor network-based parking lot surveillance system."
Wireless Sensor Networks. Springer Berlin Heidelberg, 2009. 247-262.
```

一方、屋内での位置情報をもとに何らかのサービスを提供するシステムも研究されてきた。
例えば、Bohnenbergerら\cite{Bohnenberger}はPDAと赤外線マーカーを用いてショッピングモールでの購買誘導システムを開発した。
```
\bibitem{Bohnenberger}
Bohnenberger, Thorsten, et al.
"Location-aware shopping assistance: Evaluation of a decision-theoretic approach."
Human Computer Interaction with Mobile Devices. Springer Berlin Heidelberg, 2002. 155-169.
```
![shopping](shopping1.png)

また、西村拓一らは\cite{西村拓一}太陽光パネルと光通信を無電源で位置に応じた情報を提供するシステムを開発した。
```
\bibitem{西村拓一}
西村拓一, et al
"インタラクティブ情報支援のための無電源小型情報端末."
インタラクション 2003 (2003): 163-170.
```
![](cobit2.png)

そして、実際に美術館などの公共空間においても、
  一般的なスマートデバイスを用いて作品の位置に応じた情報を提供するようなシステムの導入が始まっている\cite{Louvre}。
```
\bibitem{Louvre}
Suzuki, Takuzi, Fumio Adachi, and Yoshitsugu Manabe.
"Experimentation and Evaluation of a Multimedia Exhibition Information Service
Using Visitor-owned Portable Wi-Fi Terminals Suitable for Small-scale Museums."
ITE Transactions on Media Technology and Applications 2.3 (2014): 256-265.
```
<!--
そして、こうした技術を用いた位置情報提供サービスも考えられてきた。
古代から、位置情報は人間の生活にはなくてはならないものであった。
古代における位置に応じた情報提供の例としては、
  自身の住む集落から狩場へあるいは帰還するために道標を設置したり、
  荒野をゆく行商人にその土地の土地感を持つ道先案内人がオアシスへの道を案内したり、
  道先案内人がいなくても行動できるように海図や地図を作成したり、
  海洋をゆく船乗りが星や太陽の位置から現在位置と方位を推測したりなどして、
  自らの位置を把握し、その位置に応じた情報を得てきた。
電波やコンピュータが使えるようになってからは、
  電波よって地球表面上の大まかな位置がわかる双曲線航法、
  電波の使えない水中などでは加速度計とジャイロコンパスを用いた慣性誘導装置、
  そして宇宙からGPSなどの高精度の衛星測位ができるようになった。
こうした位置情報によって道先案内人は利用者に
  天候や治安、行政、山賊が出る場所を迂回したり武装したりする助言を与えたり、
  旅人の健康状態に合わせて旅人の未知な場所で地元の医者のいる場所を案内したり、
  国にあわせた礼儀作法を教育したり、
  次の補給位置までの距離と、それまでに配分すべき食料や水の見積もりをしたり、
  帰還不能になる地点を算出し、利用者に帰るように促したり、
  この付近の土地の有名な名所や由来を解説するなどの、
  位置に応じた情報提供を行ってきた。
現代における位置情報提供サービスも、技術は進歩したがその内容は古代より変化していない。
一方で、屋内環境においての位置情報提供サービスは、こうした技術の導入が遅れている。
  これまで屋内において迷子になるほど広い空間が少なかった。
  また、道標や地図などで十分位置情報を提供できたので、屋内での位置測位技術の発達の動機が少なかった。
-->

そこで私は、スマートデバイスによるワイヤレスアコースティックセンサネットワーク技術を用いて、
  様々なスマートデバイスに搭載されたスピーカを同期的に制御することで、
  実空間の中に仮想音源を配置することのできる音響空間を構築し、
  位置に応じた情報を提示できるシステムを開発した\ref{システムのイメージ図}。
![ここにシステムのイメージ図](shikumi1.png)
![ここにシステムのイメージ図](shikumi2.png)
このシステムは、
  教室などの屋内公共空間の中にある、
  複数の参加者が持つスマートデバイスとそのスピーカを用いて、
  仮想的な音響空間に音源を配置できる。
例えば、
  大学の教室内で講義に参加する学生の携帯端末を利用して、
  教員が仮想音響空間を制御して注意誘導をすることができる。
また、
  教室内を移動する音源を配置することで、
  教員の声が移動するかのような音響効果も演出できる。
そして、
  簡単に多数の端末を同期的に制御できるので、
  複数のディスプレイやスピーカのそれぞれから異なる映像音響素材を同時に再生し、
  立体的な表現をするような、
  マルチ映像、マルチ音響を用いたメディアアート表現\cite{近藤義秀}が
  より手軽にできるようになる。

![マルチ映像、マルチ音響を用いたメディアアート表現](multimedia.png)

```
\bibitem{近藤義秀}
近藤義秀, 中村滋延, and 栗原詩子.
"マルチ映像, マルチ音響を用いたメディアアート表現."
情報処理学会研究報告.[音楽情報科学] 2006.133 (2006): 35-40.
```

このシステムは、
  技術的には、
  スマートデバイス同士で音声信号を用いて同期し、
  全体として動作するという点では
  アドホックマイクロホンアレイと同じ技術を用いているが、
  ユーザが存在する空間そのもに働きかけ、
  音場を構成し、
  知覚に影響を与えるという点で、
  異なっている。

複数端末のスピーカを利用して音像定位するには，4つの問題がある．
1つ目の問題は，端末間の同期の問題である．
複数端末を用いた音圧レベル差定位法または時間差定位法を用いて同一の音源として知覚されるためには，各端末の音声タイミングは正確に一致させなければならない．
2つ目の問題は，端末間の距離測位の問題である．
複数端末が同時に発振しても，端末間音量バランスを制御しなければ，細かな定位を実現できない．
つまり，仮想音源の再構築には，時刻の同期のほか各スピーカおよび受聴者の相対位置を同定しなければならない．
3つ目の問題は，端末間のハードウェアおよびソフトウェアの差の問題である．
不特定多数の人々の携帯端末を使うには，スピーカおよびマイクの特性・計算速度などのハードウェア，そしてOSやアプリケーションなどのソフトウェアの差異を考慮する必要がある．
4つ目の問題は，どのようにして音像を定位するかという問題である。
様々な位置に存在する複数の聴き手に対して、共通の位置に仮想音源を音像定位を行わなければならない。

本稿ではこれらの問題へのアプローチを提示し、そのシステムの実装を説明する。
そして、実験によってシステムの有効性を検証する。











## 3ノードの場合の同期測距の時系列
![](flowchart.png)
* 端末Aの時分割された観測波形
![](rawdata.png)
* 端末Aの各区間の相関検出結果
![](corrA.png)
![](corrB.png)
![](corrC.png)

## 計測結果
* MBAを1辺2mの正三角形に配置
* 10回計測したときの検出時刻差の統計

|端末間|平均(s)|最頻値(s)|中央値(s)|標準偏差|推定距離(m)|
|--|--|--|--|--|--|
|A-B|0.0061|0.0061|0.0061|0.00001|2.08|
|A-C|0.0066|0.0067|0.0067|0.00013|2.27|
|B-C|0.0057|0.0057|0.0057|0.00001|1.94|
* 高精度に測距できた

## 同期測距まとめ
* 時刻同期と測距は質問パルスと応答パルスの時刻差から求まる
* 高精度パルス検出のために複数のパルス圧縮手法を組み合わせた
* うまくいった


# [空間音響の構築](spatial_hearing.md)

## 空間音響の構築
* 測距同期したシステムでどのような音響効果を実現するのか
* 仮想音源を配置し定位させられる
* 「音のひろがり」や「音に包まれた感じ」を実現できる

## 音像定位の手法
* 人間は音圧勾配(両耳間音圧差)で音像定位する
* 仮想音源を囲む最寄りの3ノードを鳴らすことで音像定位する

![](virtualsound.png)

## 音の広がり知覚
* 複数のスピーカを使うことの副作用
* 外にいる人は__みかけの音源の幅__(ASW: auditory source width)が生じる
  * 「先行音（直接音）の到来方向に先行音と時間的にも空間的にも融合して知覚される音の大きさ」
* 中にいる人は__音に包まれた感じ__(LEV: listener envelopment)が生じる
  * 「みかけの音源以外の音像によって聞き手のまわりが満たされている感じ」

## 音の広がり知覚
![](ASW_LEV.png)

## 空間音響まとめ
* 音圧差で音の定位を実現する
* 仮想音源付近の人は「音に包まれた感じ」を感じる
* 仮想音源から離れた人は「みかけの音源の幅」が大きくなる

## 既知の問題
* 障害物によってダイレクトパスが存在しない場合距離を正しく測定できない
  * 5m以上離れて使う必要はないのでそれ以上の距離を検出した場合は外れ値として無視してしまおう
* スピーカとマイクロホンのレベルが端末ごとに異なる
  * なんらかの相互校正法を組み込みたい

## 今後の展開
* 仮想音源の動的な移動
* チャープ+barker符号から加算M系列符号化へ
* システムにGUIつける
* 音像定位の実験
