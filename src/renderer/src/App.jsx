import { createContext, useContext, useEffect, useState } from 'react'

const iconModules = import.meta.glob('./assets/resources/*.{png,svg,jpg}', {
  eager: true,
  import: 'default'
})
const icons = Object.fromEntries(
  Object.entries(iconModules).map(([path, url]) => [path.split('/').pop(), url])
)

function concatPath(path1, path2) {
  return `${path1}/${path2}`.replace(/\/+/g, '/')
}
function changeTabPath(setTabPaths, tabId, newPath) {
  setTabPaths(prev => {
    const next = [...prev]
    next[tabId] = newPath
    return next
  })
}
function hasDirectories(files) {
  files = files.filter(file => (file.isDirectory))
  return files.length > 0
}
function readDirSafe(path, onSuccess) {
  window.api.readDir(path).then(result => {
    if (!result.error) onSuccess(result)
  })
}
function isValidPath(path) {
  window.api.readDir(path).then(result => {
    if (result.error) return false
    else return true
  })
}
function useSettings() {
  const [showDotFiles, setShowDotFiles] = useState(false)
  const [tabPaths, setTabPaths] = useState(["/"])
  const [activeTab, setActiveTab] = useState(0)
  const [insertMode, setInsertMode] = useState(false)
  const [kbdSearchLet, setKdbSearchLet] = useState("")

  return {showDotFiles, setShowDotFiles, tabPaths, setTabPaths, insertMode, setInsertMode, kbdSearchLet, setKdbSearchLet, activeTab, setActiveTab}
}

function handleKeyDown(e, settings) {
  const {insertMode, setInsertMode, kbdSearchLet, setKdbSearchLet, activeTab, tabPaths, setTabPaths} = settings

  if (e.key === "i" && !insertMode) {
    e.preventDefault()
    setInsertMode(true)
    return
  }
  else if (e.key === "Escape" && insertMode) {
    e.preventDefault()
    setInsertMode(false)
    setKdbSearchLet("")
    return
  }

  if (insertMode) {
    setKdbSearchLet(prev => {
      if (e.key === "Shift") return prev
      if (e.key === "Backspace") {
        return prev.slice(0, -1)
      }
      if (e.key === "Enter") {
        if (prev === ".") {
          // move backwards
        }
        changeTabPath(setTabPaths, activeTab, concatPath(tabPaths[activeTab], prev))
        setInsertMode(false)
        return ""
      }
      return prev + e.key
    })
  }
}
function startResize(e, sidebarWidth, setSidebarWidth) {
  const startX = e.clientX
  const startWidth = sidebarWidth

  function onMouseMove(moveEvent) {
    setSidebarWidth(startWidth + (moveEvent.clientX - startX))
  }
  function onMouseUp() {
    window.removeEventListener("mousemove", onMouseMove)
    window.removeEventListener("mouseup", onMouseUp)
  }
  window.addEventListener("mousemove", onMouseMove)
  window.addEventListener("mouseup", onMouseUp)
}

const SettingsContext = createContext()

function App() {
  const [entries, setEntries] = useState([])
  const [curPath, setCurPath] = useState('/')
  const [sidebarWidth, setSidebarWidth] = useState(200)

  const settings = useSettings()
  const {tabPaths, insertMode} = settings

  useEffect(() => {
    const listener = (e) => handleKeyDown(e, settings)
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [insertMode])

  useEffect(() => {
    readDirSafe(curPath, setEntries)
  }, [curPath])

  const tabs = tabPaths.map((path, idx) => (
    <Tab key={idx} path={path} tabId={idx}/>
  ))

  return (
    <SettingsContext.Provider value={settings}>
      <div style={{width: sidebarWidth, flexShrink: 0}}>
        <FolderList files={entries} curPath={curPath}/>
      </div>
      <div className="resize-handle" onMouseDown={(e) => startResize(e, sidebarWidth, setSidebarWidth)}></div>
      <ul className="tab-list">
        {tabs}
      </ul>
    </SettingsContext.Provider>
  )
}
function Tab({path, tabId}) {
  const [files, setFiles] = useState([])

  useEffect(() => {
    readDirSafe(path, setFiles)
  }, [path])

  const fileObjs = files.map(file => (
    <File key={file.name} file={file} tabId={tabId}/>
  ))
  return (
    <ul className="file-list">
      {fileObjs}
    </ul>
  )
}
function File({file, tabId}) {
  const {showDotFiles} = useContext(SettingsContext)
  const {tabPaths, setTabPaths} = useContext(SettingsContext)

  if (!showDotFiles && file.name.startsWith(".")) return

  return (
    <div className="file">
      <button onClick={() => {
        changeTabPath(setTabPaths, tabId, concatPath(tabPaths[tabId], file.name))
      }}>
        {file.isDirectory ? (
          <img src={icons["folder-icon.png"]} alt="folder-icon"/>
        ) : (
          <img src={icons["file-icon.png"]} alt="file-icon"/>
        )}
        <p>{file.name}</p>
      </button>
    </div>
  )
}
function FolderList({files, curPath}) {
  console.log(files)
  files = files.filter(file => (file.isDirectory))
  const flFolders = files.map(file => (
    <FLFolder key={file.name} folderName={file} curPath={curPath}/>
  ))

  return (
    <ul className="folder-list">
      {flFolders}
    </ul>
  )
}
function FLFolder({folderName, curPath}) {
  const [open, setOpen] = useState(false)
  const [children, setChildren] = useState([])
  const {showDotFiles, activeTab, setTabPaths} = useContext(SettingsContext)

  if (!showDotFiles && folderName.name.startsWith(".")) return

  useEffect(() => {
    readDirSafe(concatPath(curPath, folderName.name), setChildren)
  }, [])

  useEffect(() => {
    if (open) {
      readDirSafe(concatPath(curPath, folderName.name), setChildren)
    }
  }, [open])

  return (
    <div className="fl-folder">
      <div className="fl-folder-content">
        <button className={`${open ? "arrow-open" : ""} ${!hasDirectories(children) ? "hide" : ""}`} onClick={() => {
          const next = !open
          setOpen(next)
        }}>
          <img src={icons["arrow-icon.png"]}/>
        </button>
        <img src={icons["folder-icon.png"]} alt="folder icon"/>
        <button onClick={() => changeTabPath(setTabPaths, activeTab, concatPath(curPath, folderName.name))}>
          <p>{folderName.name}</p>
        </button>
      </div>
      {open && <FolderList files={children} curPath={concatPath(curPath, folderName.name)}/>}
    </div>
  )
}

export default App
