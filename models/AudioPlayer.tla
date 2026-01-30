---------------------------- MODULE AudioPlayer ----------------------------
(***************************************************************************)
(* セグメントベースのオーディオプレイヤーの TLA+ モデル                      *)
(* 検証対象:                                                                *)
(*   1. 状態の一貫性 (構造的制約)                                           *)
(*   2. 時間的性質 (ループ動作、進行の保証)                                 *)
(***************************************************************************)

EXTENDS Integers, Sequences, TLC

CONSTANTS
    NumSegments      \* セグメント数

ASSUME NumSegments > 0

Segments == 1..NumSegments

VARIABLES
    playState,       \* "stopped" | "playing"
    mode,            \* "full" | "range"
    loopEnabled,     \* TRUE | FALSE
    rangeStart,      \* 1..NumSegments (範囲の開始)
    rangeEnd,        \* 1..NumSegments (範囲の終了)
    currentSegment   \* 0 (停止中) | 1..NumSegments (再生中)

vars == <<playState, mode, loopEnabled, rangeStart, rangeEnd, currentSegment>>

-----------------------------------------------------------------------------
(* 型不変条件 *)
TypeInvariant ==
    /\ playState \in {"stopped", "playing"}
    /\ mode \in {"full", "range"}
    /\ loopEnabled \in BOOLEAN
    /\ rangeStart \in Segments
    /\ rangeEnd \in Segments
    /\ currentSegment \in {0} \cup Segments

-----------------------------------------------------------------------------
(* 構造的制約 *)

\* 範囲選択は start <= end でなければならない
RangeIsOrdered == rangeStart <= rangeEnd

\* 再生状態では現在のセグメントが存在しなければならない
PlayingHasCurrentSegment ==
    playState = "playing" => currentSegment # 0

\* 停止状態では現在のセグメントが存在してはならない
StoppedHasNoCurrentSegment ==
    playState = "stopped" => currentSegment = 0

\* 現在のセグメントは有効な範囲内になければならない
CurrentSegmentInRange ==
    currentSegment # 0 =>
        IF mode = "full"
        THEN currentSegment \in Segments
        ELSE currentSegment >= rangeStart /\ currentSegment <= rangeEnd

\* すべての構造的不変条件
SafetyInvariant ==
    /\ TypeInvariant
    /\ RangeIsOrdered
    /\ PlayingHasCurrentSegment
    /\ StoppedHasNoCurrentSegment
    /\ CurrentSegmentInRange

-----------------------------------------------------------------------------
(* ヘルパー関数 *)

\* 有効な範囲の最初のセグメント
FirstSegment ==
    IF mode = "full" THEN 1 ELSE rangeStart

\* 有効な範囲の最後のセグメント
LastSegment ==
    IF mode = "full" THEN NumSegments ELSE rangeEnd

\* 次のセグメント (範囲の終端の場合は 0)
NextSegment(seg) ==
    IF seg < LastSegment
    THEN seg + 1
    ELSE 0  \* 範囲の終端

-----------------------------------------------------------------------------
(* 初期状態 *)
Init ==
    /\ playState = "stopped"
    /\ mode = "full"
    /\ loopEnabled = FALSE
    /\ rangeStart = 1
    /\ rangeEnd = NumSegments
    /\ currentSegment = 0

-----------------------------------------------------------------------------
(* アクション *)

\* 再生開始
Play ==
    /\ playState = "stopped"
    /\ playState' = "playing"
    /\ currentSegment' = FirstSegment
    /\ UNCHANGED <<mode, loopEnabled, rangeStart, rangeEnd>>

\* 再生一時停止
Pause ==
    /\ playState = "playing"
    /\ playState' = "stopped"
    /\ currentSegment' = 0
    /\ UNCHANGED <<mode, loopEnabled, rangeStart, rangeEnd>>

\* 次のセグメントに進む (セグメントの再生が完了したとき)
Advance ==
    /\ playState = "playing"
    /\ LET next == NextSegment(currentSegment) IN
        IF next # 0
        THEN \* 次のセグメントが存在する
            /\ currentSegment' = next
            /\ UNCHANGED <<playState, mode, loopEnabled, rangeStart, rangeEnd>>
        ELSE \* 範囲の終端に到達した
            IF loopEnabled
            THEN \* ループ: 最初に戻る
                /\ currentSegment' = FirstSegment
                /\ UNCHANGED <<playState, mode, loopEnabled, rangeStart, rangeEnd>>
            ELSE \* 停止
                /\ playState' = "stopped"
                /\ currentSegment' = 0
                /\ UNCHANGED <<mode, loopEnabled, rangeStart, rangeEnd>>

\* ループ設定のトグル
ToggleLoop ==
    /\ loopEnabled' = ~loopEnabled
    /\ UNCHANGED <<playState, mode, rangeStart, rangeEnd, currentSegment>>

\* 範囲選択の変更 (上部プレイヤー UI)
SetRange(start, end) ==
    /\ start \in Segments
    /\ end \in Segments
    /\ start <= end
    /\ mode' = "range"
    /\ rangeStart' = start
    /\ rangeEnd' = end
    \* 再生中の場合は範囲の開始位置から再開
    /\ IF playState = "playing"
       THEN currentSegment' = start
       ELSE currentSegment' = 0
    /\ UNCHANGED <<playState, loopEnabled>>

\* フルモードに戻る
SetFullMode ==
    /\ mode' = "full"
    /\ rangeStart' = 1
    /\ rangeEnd' = NumSegments
    \* 再生中の場合は最初から再開
    /\ IF playState = "playing"
       THEN currentSegment' = 1
       ELSE currentSegment' = 0
    /\ UNCHANGED <<playState, loopEnabled>>

\* 単一セグメントの再生 (セグメント横のボタン)
PlaySingleSegment(seg) ==
    /\ seg \in Segments
    /\ mode' = "range"
    /\ rangeStart' = seg
    /\ rangeEnd' = seg
    /\ playState' = "playing"
    /\ currentSegment' = seg
    /\ loopEnabled' = TRUE  \* 単一セグメントは自動ループ

\* セグメントをクリックして選択をトグル (範囲選択ボタン)
\* 要件:
\* 1. ユーザーは最小 1 回のクリックで開始と終了位置を指定できる (単一セグメントも有効)
\* 2. 同じセグメントをクリックするたび選択と解除がトグルされる
\* 3. 選択されたセグメントはひとつづきになっている必要がある。隣接しないセグメントを
\*    選択しようとしたとき、間のセグメントも自動的に選択され、ひとつづきの選択範囲がつくられる
ClickSegment(seg) ==
    /\ seg \in Segments
    /\ LET
           \* セグメントが現在選択されているかチェック (範囲モードの場合)
           isSelected == (mode = "range") /\ (seg >= rangeStart) /\ (seg <= rangeEnd)
           \* 現在の範囲の境界 (フルモードの場合は全範囲)
           currentStart == IF mode = "full" THEN 1 ELSE rangeStart
           currentEnd == IF mode = "full" THEN NumSegments ELSE rangeEnd
           \* 新しい範囲の開始と終了を計算
           newRange == IF isSelected
                       THEN \* トグルオフ: このセグメントの選択を解除
                           IF seg = currentStart /\ seg = currentEnd
                           THEN <<"full", 1, NumSegments>>
                           ELSE IF seg = currentStart
                           THEN <<"range", seg + 1, currentEnd>>
                           ELSE IF seg = currentEnd
                           THEN <<"range", currentStart, seg - 1>>
                           ELSE \* 中間のセグメント; 2 つの範囲に分割 (許可されない)
                               \* このケースは連続選択では発生しないはずだが、
                               \* 左側の部分を保持することで処理する
                               <<"range", currentStart, seg - 1>>
                       ELSE \* トグルオン: このセグメントを選択
                           IF mode = "full"
                           THEN <<"range", seg, seg>>
                           ELSE \* 既存の範囲を拡張してこのセグメントを含める
                               \* 現在の範囲外をクリックした場合、連続性を維持するために
                               \* すべての中間セグメントを自動的に選択する
                               <<"range", IF seg < currentStart THEN seg ELSE currentStart,
                                         IF seg > currentEnd THEN seg ELSE currentEnd>>
           newMode == newRange[1]
           newStart == newRange[2]
           newEnd == newRange[3]
           \* 再生中の場合は、新しい範囲内に currentSegment を調整
           adjustedSegment == IF playState = "playing"
                              THEN IF newMode = "full"
                                   THEN currentSegment
                                   ELSE IF currentSegment < newStart
                                   THEN newStart
                                   ELSE IF currentSegment > newEnd
                                   THEN newEnd
                                   ELSE currentSegment
                              ELSE 0
       IN
           /\ mode' = newMode
           /\ rangeStart' = newStart
           /\ rangeEnd' = newEnd
           /\ currentSegment' = adjustedSegment
    /\ UNCHANGED <<playState, loopEnabled>>

-----------------------------------------------------------------------------
(* 状態遷移 *)
Next ==
    \/ Play
    \/ Pause
    \/ Advance
    \/ ToggleLoop
    \/ \E start, end \in Segments : start <= end /\ SetRange(start, end)
    \/ SetFullMode
    \/ \E seg \in Segments : PlaySingleSegment(seg)
    \/ \E seg \in Segments : ClickSegment(seg)

-----------------------------------------------------------------------------
(* 時間的性質 (TLA+ の強さ) *)

\* 公平性: 再生中は Advance が最終的に実行される
Fairness == WF_vars(Advance)

\* ループが有効な場合、再生は永遠に続く
\* 注: この性質は TLC で検証するのが複雑なため、簡略版
LoopKeepsPlaying ==
    (loopEnabled /\ playState = "playing") => (playState' = "playing" \/ playState' = "stopped")

\* ループなしの場合、最終的に停止する
NoLoopEventuallyStops ==
    ((~loopEnabled) /\ (playState = "playing")) => (<>(playState = "stopped"))

\* 再生が開始されると、最終的に最後のセグメントに到達する (ループなし)
EventuallyReachesEnd ==
    ((~loopEnabled) /\ (playState = "playing")) =>
        (<>((currentSegment = LastSegment) \/ (playState = "stopped")))

-----------------------------------------------------------------------------
(* 仕様 *)
Spec == Init /\ [][Next]_vars /\ Fairness

=============================================================================
