import { useState, useCallback, useEffect } from "react";
import * as Y from "yjs";
import "./App.css";

const JSONNode = ({ name, value, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);
  const isEmpty = isObject && Object.keys(value).length === 0;

  if (!isObject) {
    let valueClass = "json-string";
    let displayValue = JSON.stringify(value);

    if (typeof value === "number") valueClass = "json-number";
    if (typeof value === "boolean") valueClass = "json-boolean";
    if (value === null) valueClass = "json-null";

    return (
      <div className="json-line">
        {name && <span className="json-key">"{name}":</span>}
        <span className={valueClass}>{displayValue}</span>
        {!isLast && <span className="json-comma">,</span>}
      </div>
    );
  }

  const keys = Object.keys(value);
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  if (isEmpty) {
    return (
      <div className="json-line">
        {name && <span className="json-key">"{name}":</span>}
        <span className="json-bracket">
          {openBracket}
          {closeBracket}
        </span>
        {!isLast && <span className="json-comma">,</span>}
      </div>
    );
  }

  return (
    <div className="json-element">
      <div className="json-line">
        <span
          className="json-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "▼" : "▶"}
        </span>
        {name && <span className="json-key">"{name}":</span>}
        <span className="json-bracket">{openBracket}</span>
        {!isExpanded && <span className="json-placeholder">...</span>}
        {!isExpanded && <span className="json-bracket">{closeBracket}</span>}
        {!isExpanded && !isLast && <span className="json-comma">,</span>}
      </div>

      {isExpanded && (
        <div className="json-content" style={{ paddingLeft: "1.5rem" }}>
          {keys.map((key, index) => (
            <JSONNode
              key={key}
              name={isArray ? null : key}
              value={value[key]}
              isLast={index === keys.length - 1}
            />
          ))}
          <div className="json-line">
            <span className="json-bracket">{closeBracket}</span>
            {!isLast && <span className="json-comma">,</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const JSONTree = ({ data }) => {
  return (
    <div className="json-tree">
      <JSONNode value={data} isLast={true} />
    </div>
  );
};

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const update = new Uint8Array(buffer);

      const doc = new Y.Doc();
      Y.applyUpdate(doc, update);

      let json = null;
      try {
        const objectsMap = doc.getMap("objects");
        const objectData = objectsMap.get("object_data");
        if (objectData && typeof objectData.toJSON === "function") {
          json = objectData.toJSON();
        } else if (objectsMap.toJSON) {
          json = objectsMap.toJSON();
        } else {
          json = doc.toJSON(); // Fallback
        }
      } catch (e) {
        console.warn(
          "Specific structure parsing failed, falling back to doc.toJSON()",
          e
        );
        json = doc.toJSON();
      }

      const newFile = {
        name: file.name,
        data: json,
        timestamp: new Date().toLocaleTimeString(),
      };

      setFiles((prev) => {
        const newFiles = [...prev, newFile];
        return newFiles;
      });

      // Automatically select the first file we have a file and nothing is selected
      setSelectedFileIndex((prev) => (prev === null ? 0 : prev));
    } catch (err) {
      console.error(err);
      alert(`Failed to decode file ${file.name}.`);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
      e.dataTransfer.clearData();
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.relatedTarget || e.relatedTarget.nodeName === "HTML") {
      setIsDragging(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragleave", handleDragLeave);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragleave", handleDragLeave);
    };
  }, [handleDragOver, handleDrop, handleDragLeave]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
    e.target.value = "";
  };

  const selectedData =
    selectedFileIndex !== null && files[selectedFileIndex]
      ? files[selectedFileIndex].data
      : null;

  return (
    <div className={`app-container ${isDragging ? "dragging-global" : ""}`}>
      {/* Sidebar for File List */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Attached Files</h3>
        </div>
        <div className="file-list">
          {files.length === 0 && (
            <div className="empty-list">No files attached</div>
          )}
          {files.map((file, index) => (
            <div
              key={index}
              className={`file-item ${
                index === selectedFileIndex ? "active" : ""
              }`}
              onClick={() => setSelectedFileIndex(index)}
            >
              <div className="file-name">{file.name}</div>
              <div className="file-time">{file.timestamp}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {selectedData ? (
          <div className="json-viewer">
            <JSONTree data={selectedData} />
          </div>
        ) : (
          <div className="empty-state">
            <h1>Y.Doc Decoder</h1>
            <p>Drag & Drop files anywhere or click the + button</p>
          </div>
        )}
      </div>

      {/* Floating Upload Button */}
      <button
        className="fab-add"
        onClick={() => document.getElementById("hiddenFileInput").click()}
        title="Add File"
      >
        +
      </button>

      {/* Hidden Input */}
      <input
        type="file"
        id="hiddenFileInput"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Drag Overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <h1>Drop files here</h1>
        </div>
      )}
    </div>
  );
}

export default App;
