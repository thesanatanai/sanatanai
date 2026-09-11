import { useNotification } from "@/components/Notification";
import { ChangeEvent, useEffect } from "react";
import { supportedFiles } from "./utils";
import { FileText, X } from "lucide-react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import Image from "next/image";

export default function useFileManager([stateFiles, setFiles]: uStat<
  UserFileData[]
>) {
  const notification = useNotification<true>();

  function handleInput(ev: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    const files = Array.from((ev.target as HTMLInputElement).files as FileList);
    if (!files?.length) return;
    handleFiles(files);
  }

  function handleFiles(files: File[]) {
    if (stateFiles.length >= 3) {
      notification("fileLimitExceeded", {
        language: true,
        type: "error",
      });
      return;
    }

    const remainingSlots = 3 - stateFiles.length;
    if (files.length > remainingSlots) {
      notification("fileLimitExceeded", {
        language: true,
        type: "error",
      });
    }
    files = files.slice(0, remainingSlots);
    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isPlainTextFallback =
        file.type === "" || file.type.startsWith("text/");
      if (!supportedFiles.includes(file.type) && !isPlainTextFallback) {
        notification("unsupportedFileType", {
          language: true,
          type: "error",
        });
        return;
      }
      const type = supportedFiles.includes(file.type)
        ? file.type
        : "text/plain";
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (!result || typeof result !== "string") return;
        const fileData: UserFileData = {
          maindata: {
            file: file,
            type: type,
            content: result.split(",")[1],
          },
          filename: file.name,
          isImage: isImage,
          wholeData: result,
        };
        if (!stateFiles.some((f) => f.filename == file.name)) {
          setFiles([...stateFiles, fileData]);
        }
      };
      reader.onerror = () => {
        notification("errorReading", {
          language: true,
          type: "error",
        });
      };
      reader.readAsDataURL(file);
    });
  }
  function FilePreview() {
    return (
      <div className="file-preview-mini">
        {stateFiles.map((file) => {
          return (
            <p
              className={`file ${file.isImage ? "image" : "other"}`}
              key={file.filename}
            >
              {file.isImage ? (
                <Image
                  src={file.wholeData}
                  alt="File"
                  width={50}
                  height={50}
                  className="file-upload-img"
                  unoptimized
                />
              ) : (
                <code className="sanatan-symbol center-flex">
                  <FileText />
                </code>
              )}
              {formatName(file.filename)}
              <X
                className="sanatan-symbol"
                onClick={() => removeFile(file.filename)}
              />
            </p>
          );
        })}
      </div>
    );
  }

  function removeFile(name: string) {
    setFiles(stateFiles.filter((file) => file.filename !== name));
    notification("successfullyRemoved", {
      language: true,
      type: "success",
    });
  }

  return { handleInput, FilePreview };
}

function formatName(name: string) {
  if (name.length > 10) return name.slice(0, 7) + "...";
  return name;
}

export function useStartRecording(
  setMessage: (val: string) => void,
) {
  const {
    browserSupportsSpeechRecognition,
    listening,
    transcript,
    resetTranscript,
  } = useSpeechRecognition();
  useEffect(() => {
    setMessage(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);
  return {
    supported: browserSupportsSpeechRecognition,
    listening,
    transcript,
    start: async function () {
      resetTranscript();
      await SpeechRecognition.startListening();
    },
    stop: SpeechRecognition.stopListening,
    toggle: listening
      ? SpeechRecognition.stopListening
      : SpeechRecognition.startListening,
  };
}
