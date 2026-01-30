---------------------------- MODULE AudioPlayer ----------------------------
(***************************************************************************)
(* セグメントベースのオーディオプレイヤーの TLA+ モデル                      *)
(* 検証対象:                                                                *)
(*   1. 状態の一貫性 (構造的制約)                                           *)
(*   2. 時間的性質 (ループ動作、進行の保証)                                 *)
(*                                                                          *)
(* セグメント選択は非連続で可能 (各セグメントを個別にトグル)                *)
(***************************************************************************)

EXTENDS Integers, FiniteSets, TLC

CONSTANTS
    NumSegments      \* セグメント数

ASSUME NumSegments > 0

Segments == 1..NumSegments

VARIABLES
    playState,         \* "stopped" | "playing"
    loopEnabled,       \* TRUE | FALSE
    selectedSegments,  \* SUBSET Segments (選択されたセグメントの集合)
    currentSegment     \* 0 (停止中) | 1..NumSegments (再生中)

vars == <<playState, loopEnabled, selectedSegments, currentSegment>>

-----------------------------------------------------------------------------
(* 型不変条件 *)
TypeInvariant ==
    /\ playState \in {"stopped", "playing"}
    /\ loopEnabled \in BOOLEAN
    /\ selectedSegments \subseteq Segments
    /\ currentSegment \in {0} \cup Segments

-----------------------------------------------------------------------------
(* 構造的制約 *)

\* 再生状態では現在のセグメントが存在しなければならない
PlayingHasCurrentSegment ==
    playState = "playing" => currentSegment # 0

\* 停止状態では現在のセグメントが存在してはならない
StoppedHasNoCurrentSegment ==
    playState = "stopped" => currentSegment = 0

\* 現在のセグメントは選択されたセグメント内になければならない
CurrentSegmentIsSelected ==
    currentSegment # 0 => currentSegment \in selectedSegments

\* すべての構造的不変条件
SafetyInvariant ==
    /\ TypeInvariant
    /\ PlayingHasCurrentSegment
    /\ StoppedHasNoCurrentSegment
    /\ CurrentSegmentIsSelected

-----------------------------------------------------------------------------
(* ヘルパー関数 *)

\* 選択されたセグメントの最初のもの (なければ 0)
FirstSelectedSegment ==
    IF selectedSegments = {} THEN 0
    ELSE CHOOSE s \in selectedSegments : \A t \in selectedSegments : s <= t

\* 現在のセグメントの次の選択されたセグメント (なければ 0)
NextSelectedSegment(seg) ==
    LET greater == {s \in selectedSegments : s > seg}
    IN IF greater = {} THEN 0
       ELSE CHOOSE s \in greater : \A t \in greater : s <= t

-----------------------------------------------------------------------------
(* 初期状態 *)
Init ==
    /\ playState = "stopped"
    /\ loopEnabled = FALSE
    /\ selectedSegments = Segments  \* 全選択で開始
    /\ currentSegment = 0

-----------------------------------------------------------------------------
(* アクション *)

\* 再生開始
Play ==
    /\ playState = "stopped"
    /\ selectedSegments # {}
    /\ playState' = "playing"
    /\ currentSegment' = FirstSelectedSegment
    /\ UNCHANGED <<loopEnabled, selectedSegments>>

\* 再生一時停止
Pause ==
    /\ playState = "playing"
    /\ playState' = "stopped"
    /\ currentSegment' = 0
    /\ UNCHANGED <<loopEnabled, selectedSegments>>

\* 次のセグメントに進む (セグメントの再生が完了したとき)
Advance ==
    /\ playState = "playing"
    /\ LET next == NextSelectedSegment(currentSegment) IN
        IF next # 0
        THEN \* 次のセグメントが存在する
            /\ currentSegment' = next
            /\ UNCHANGED <<playState, loopEnabled, selectedSegments>>
        ELSE \* 最後の選択セグメントに到達した
            IF loopEnabled
            THEN \* ループ: 最初に戻る
                /\ currentSegment' = FirstSelectedSegment
                /\ UNCHANGED <<playState, loopEnabled, selectedSegments>>
            ELSE \* 停止
                /\ playState' = "stopped"
                /\ currentSegment' = 0
                /\ UNCHANGED <<loopEnabled, selectedSegments>>

\* ループ設定のトグル
ToggleLoop ==
    /\ loopEnabled' = ~loopEnabled
    /\ UNCHANGED <<playState, selectedSegments, currentSegment>>

\* セグメントの選択をトグル
ToggleSegment(seg) ==
    /\ seg \in Segments
    /\ IF seg \in selectedSegments
       THEN \* 選択解除
           /\ selectedSegments' = selectedSegments \ {seg}
           \* 再生中に現在のセグメントが解除された場合は停止
           /\ IF playState = "playing" /\ currentSegment = seg
              THEN /\ playState' = "stopped"
                   /\ currentSegment' = 0
              ELSE UNCHANGED <<playState, currentSegment>>
       ELSE \* 選択
           /\ selectedSegments' = selectedSegments \cup {seg}
           /\ UNCHANGED <<playState, currentSegment>>
    /\ UNCHANGED <<loopEnabled>>

\* 全選択
SelectAll ==
    /\ selectedSegments' = Segments
    /\ playState' = "stopped"
    /\ currentSegment' = 0
    /\ UNCHANGED <<loopEnabled>>

\* 全解除
SelectNone ==
    /\ selectedSegments' = {}
    /\ playState' = "stopped"
    /\ currentSegment' = 0
    /\ UNCHANGED <<loopEnabled>>

\* 単一セグメントの再生 (セグメント横のボタン、常にループ)
PlaySingleSegment(seg) ==
    /\ seg \in Segments
    /\ selectedSegments' = {seg}
    /\ playState' = "playing"
    /\ currentSegment' = seg
    /\ loopEnabled' = TRUE

-----------------------------------------------------------------------------
(* 状態遷移 *)
Next ==
    \/ Play
    \/ Pause
    \/ Advance
    \/ ToggleLoop
    \/ \E seg \in Segments : ToggleSegment(seg)
    \/ SelectAll
    \/ SelectNone
    \/ \E seg \in Segments : PlaySingleSegment(seg)

-----------------------------------------------------------------------------
(* 時間的性質 *)

\* 公平性: 再生中は Advance が最終的に実行される
Fairness == WF_vars(Advance)

\* ループなしの場合、最終的に停止する
NoLoopEventuallyStops ==
    ((~loopEnabled) /\ (playState = "playing")) => (<>(playState = "stopped"))

-----------------------------------------------------------------------------
(* 仕様 *)
Spec == Init /\ [][Next]_vars /\ Fairness

=============================================================================
