import { useNotification } from "@/components/Notification";
import { ChangeEvent } from "react";
import { supportedFiles } from "./utils";
import { FileText, X } from "lucide-react"

export default function useFileManager([stateFiles, setFiles]: uStat<UserFileData[]>) {
  const notification = useNotification<true>();

  function handleInput(ev: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    const files = Array.from((ev.target as HTMLInputElement).files as FileList);
    if (!files?.length) return;
    handleFiles(files);
  }
  
  function handleFiles(files: File[]) {
    if (stateFiles.length == 3) {
      notification("fileLimitExceeded", {
        language: true,
        type: "error",
      });
      return;
    }
    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      let type = "text/plain";
      if (supportedFiles.includes(file.type)) type = file.type;
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
        {stateFiles.map(file => {
          return (
            <p className={`file ${file.isImage ? "image" : "other"}`} key={file.filename}>
              {/*eslint-disable-next-line @next/next/no-img-element*/}
              {file.isImage ? <img src={file.wholeData} alt="File" className="file-upload-img" /> : <code className="sanatan-symbol center-flex"><FileText /></code>}
              {formatName(file.filename)}
                <X className="sanatan-symbol" onClick={() => removeFile(file.filename)}/>
            </p>
          );
        })}
      </div>
    );
  }

   function removeFile(name: string) {
    setFiles(stateFiles.filter(file => file.filename !== name));
    notification("successfullyRemoved", {
      language: true,
      type: "success"
    });
   }

  return { handleInput, FilePreview }
}

function formatName(name: string) {
  if (name.length > 10) return name.slice(0, 7) + "...";
  return name;
}
