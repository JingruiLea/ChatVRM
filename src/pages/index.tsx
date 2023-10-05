import { use, useCallback, useContext, useEffect, useState } from "react";
import VrmViewer from "@/components/vrmViewer";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import {
  Message,
  textsToScreenplay,
  Screenplay,
} from "@/features/messages/messages";
import { speakCharacter } from "@/features/messages/speakCharacter";
import { MessageInputContainer } from "@/components/messageInputContainer";
import { SYSTEM_PROMPT } from "@/features/constants/systemPromptConstants";
import { KoeiroParam, DEFAULT_PARAM } from "@/features/constants/koeiroParam";
import { getChatResponseStream } from "@/features/chat/openAiChat";
import { Introduction } from "@/components/introduction";
import { Menu } from "@/components/menu";
import { GitHubLink } from "@/components/githubLink";
import { Meta } from "@/components/meta";
import { getXiaoweiChatResponse } from "@/features/wukong/wukong";

export default function Home() {
  const { viewer } = useContext(ViewerContext);

  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
  const [openAiKey, setOpenAiKey] = useState("");
  const [koeiromapKey, setKoeiromapKey] = useState("");
  const [koeiroParam, setKoeiroParam] = useState<KoeiroParam>(DEFAULT_PARAM);
  const [chatProcessing, setChatProcessing] = useState(false);
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [assistantMessage, setAssistantMessage] = useState("");

  useEffect(() => {
    if (window.localStorage.getItem("chatVRMParams")) {
      const params = JSON.parse(
        window.localStorage.getItem("chatVRMParams") as string
      );
      setSystemPrompt(params.systemPrompt);
      setKoeiroParam(params.koeiroParam);
      setChatLog(params.chatLog);
    }
  }, []);

  useEffect(() => {
    process.nextTick(() =>
      window.localStorage.setItem(
        "chatVRMParams",
        JSON.stringify({ systemPrompt, koeiroParam, chatLog })
      )
    );
  }, [systemPrompt, koeiroParam, chatLog]);

  const handleChangeChatLog = useCallback(
    (targetIndex: number, text: string) => {
      const newChatLog = chatLog.map((v: Message, i) => {
        return i === targetIndex ? { role: v.role, content: text } : v;
      });

      setChatLog(newChatLog);
    },
    [chatLog]
  );

  /**
   * 文ごとに音声を直列でリクエストしながら再生する`
   */
  const handleSpeakAi = useCallback(
    async (
      audio:string,
      screenplay: Screenplay,
      onStart?: () => void,
      onEnd?: () => void
    ) => {
      speakCharacter(audio,screenplay, viewer, koeiromapKey, onStart, onEnd);
    },
    [viewer, koeiromapKey]
  );

  useEffect(() => {
    const socket = new WebSocket('ws://192.168.31.98:5001/websocket');
    
    // 监听连接建立事件
    socket.addEventListener('open', (event) => {
      console.log('WebSocket连接已建立');
    });
    socket.addEventListener('message', (event) => {
      console.log('接收到消息',event.data)
      const data = JSON.parse(event.data);
      // 在这里处理接收到的消息逻辑
      const message = data.text
      const audio = data.audio

      const aiTalks = textsToScreenplay([message], koeiroParam);
      // 文ごとに音声を生成 & 再生、返答を表示
      const currentAssistantMessage = message;
      handleSpeakAi(audio,aiTalks[0], () => {
        setAssistantMessage(currentAssistantMessage);
      });
    });
  
  
    return () => {
      // 在组件卸载时关闭WebSocket连接
      socket.close();
    };
  }, []); // 空数组确保只在组件挂载和卸载时执行
  



  /**
   * アシスタントとの会話を行う
   */


  const handleSendChat = useCallback(
    async (text: string) => {
      // if (!openAiKey) {
      //   setAssistantMessage("APIキーが入力されていません");
      //   return;
      // }

      const newMessage = text;

      if (newMessage == null) return;

      setChatProcessing(true);
      // ユーザーの発言を追加して表示
      const messageLog: Message[] = [
        ...chatLog,
        { role: "user", content: newMessage },
      ];
      setChatLog(messageLog);

      // Chat GPTへ
      const messages: Message[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messageLog,
      ];

      const xiaowei_res = await getXiaoweiChatResponse(newMessage,"text").catch((e) => {
        console.error(e);
        return null;
      });
      const message = xiaowei_res?.message
      const audio = xiaowei_res?.audio
      if (message == null) {
        setChatProcessing(false);
        return;
      }
      const aiTalks = textsToScreenplay([message], koeiroParam);
      // 文ごとに音声を生成 & 再生、返答を表示
      const currentAssistantMessage = message;
      handleSpeakAi(audio,aiTalks[0], () => {
        setAssistantMessage(currentAssistantMessage);
      });


      // const stream = await getChatResponseStream(messages, openAiKey).catch(
      //   (e) => {
      //     console.error(e);
      //     return null;
      //   }
      // );
      // if (stream == null) {
      //   setChatProcessing(false);
      //   return;
      // }

      // const reader = stream.getReader();
      // let receivedMessage = "";
      // let aiTextLog = "";
      // let tag = "";
      // // const sentences = new Array<string>();
      // try {
      //   while (true) {
      //     const { done, value } = await reader.read();
      //     if (done) break;

      //     receivedMessage += value;

      //     // 返答内容のタグ部分の検出
      //     const tagMatch = receivedMessage.match(/^\[(.*?)\]/);
      //     if (tagMatch && tagMatch[0]) {
      //       tag = tagMatch[0];
      //       receivedMessage = receivedMessage.slice(tag.length);
      //     }

      //     // 返答を一文単位で切り出して処理する
      //     const sentenceMatch = receivedMessage.match(
      //       /^(.+[。．！？\n]|.{10,}[、,])/
      //     );
      //     if (sentenceMatch && sentenceMatch[0]) {
      //       const sentence = sentenceMatch[0];
      //       console.log("sentence",sentence);
      //       sentences.push(sentence);
      //       receivedMessage = receivedMessage
      //         .slice(sentence.length)
      //         .trimStart();

      //       // 発話不要/不可能な文字列だった場合はスキップ
      //       if (
      //         !sentence.replace(
      //           /^[\s\[\(\{「［（【『〈《〔｛«‹〘〚〛〙›»〕》〉』】）］」\}\)\]]+$/g,
      //           ""
      //         )
      //       ) {
      //         continue;
      //       }

      //       const aiText = `${tag} ${sentence}`;
      //       const aiTalks = textsToScreenplay([aiText], koeiroParam);
      //       aiTextLog += aiText;
      //       console.log("aiText",aiText);

      //       // 文ごとに音声を生成 & 再生、返答を表示
      //       const currentAssistantMessage = sentences.join(" ");
      //       handleSpeakAi(aiTalks[0], () => {
      //         setAssistantMessage(currentAssistantMessage);
      //       });
      //     }
      //   }
      // } catch (e) {
      //   setChatProcessing(false);
      //   console.error(e);
      // } finally {
      //   reader.releaseLock();
      // }

      // アシスタントの返答をログに追加
      const messageLogAssistant: Message[] = [
        ...messageLog,
        { role: "assistant", content: message },
      ];

      setChatLog(messageLogAssistant);
      setChatProcessing(false);
    },
    [systemPrompt, chatLog, handleSpeakAi, openAiKey, koeiroParam]
  );


  const handleStartCommand = useCallback(
    async (text: string) => {

      const newMessage = text;

      if (newMessage == null) return;

      setChatProcessing(true);
      // ユーザーの発言を追加して表示
      const messageLog: Message[] = [
        ...chatLog,
        { role: "user", content: newMessage },
      ];
      setChatLog(messageLog);


      const xiaowei_res = await getXiaoweiChatResponse("","start").catch((e) => {
        console.error(e);
        return null;
      });
      const message = xiaowei_res?.message
      const audio = xiaowei_res?.audio
      if (message == null) {
        setChatProcessing(false);
        return;
      }
      const aiTalks = textsToScreenplay([message], koeiroParam);
      // 文ごとに音声を生成 & 再生、返答を表示
      const currentAssistantMessage = message;
      handleSpeakAi(audio,aiTalks[0], () => {
        setAssistantMessage(currentAssistantMessage);
      });
      const messageLogAssistant: Message[] = [
        ...messageLog,
        { role: "assistant", content: message },
      ];

      setChatLog(messageLogAssistant);
      setChatProcessing(false);
    },
    [systemPrompt, chatLog, handleSpeakAi, openAiKey, koeiroParam]
  );

  return (
    <div className={"font-M_PLUS_2"}>
      <Meta />
      <Introduction
        openAiKey={openAiKey}
        koeiroMapKey={koeiromapKey}
        onChangeAiKey={setOpenAiKey}
        onChangeKoeiromapKey={setKoeiromapKey}
      />
      <VrmViewer />
      <MessageInputContainer
        isChatProcessing={chatProcessing}
        onChatProcessStart={handleSendChat}
        onChatStartMethod={handleStartCommand}
      />
      <Menu
        openAiKey={openAiKey}
        systemPrompt={systemPrompt}
        chatLog={chatLog}
        koeiroParam={koeiroParam}
        assistantMessage={assistantMessage}
        koeiromapKey={koeiromapKey}
        onChangeAiKey={setOpenAiKey}
        onChangeSystemPrompt={setSystemPrompt}
        onChangeChatLog={handleChangeChatLog}
        onChangeKoeiromapParam={setKoeiroParam}
        handleClickResetChatLog={() => setChatLog([])}
        handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
        onChangeKoeiromapKey={setKoeiromapKey}
      />
      {/* <GitHubLink /> */}
    </div>
  );
}
