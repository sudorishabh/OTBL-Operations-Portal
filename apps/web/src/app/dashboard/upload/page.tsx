"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, File as FileIcon, X, CheckCircle2, Image as ImageIcon, FileText, Download, Trash2, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function DocumentUploadPage() {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [previousUploads, setPreviousUploads] = useState([
    { id: 1, name: "Q3_Financial_Report.pdf", size: 2450000, type: "application/pdf", date: "Oct 15, 2023" },
    { id: 2, name: "Employee_Handbook_v2.docx", size: 1200000, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", date: "Oct 12, 2023" },
    { id: 3, name: "Project_Timeline.xlsx", size: 850000, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", date: "Oct 10, 2023" },
    { id: 4, name: "Team_Offsite_Photo.jpg", size: 4200000, type: "image/jpeg", date: "Oct 5, 2023" }
  ]);

  const removePreviousUpload = (idToRemove: number) => {
    setPreviousUploads(previousUploads.filter(upload => upload.id !== idToRemove));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const handleUpload = () => {
    if (files.length === 0) return;

    setUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          setFiles([]);
        }, 500);
      }
    }, 200);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-8 w-8 text-red-500" />;
    return <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className='container mx-auto p-6 max-w-4xl'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Upload Documents</h1>
          <p className="text-muted-foreground mt-1">Upload and manage your files securely.</p>
        </div>
      </div>

      <Card className={`border-dashed border-2 transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 bg-muted/30'}`}>
        <CardContent
          className="p-10 flex flex-col items-center justify-center text-center min-h-[300px]"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className={`p-4 rounded-full mb-4 transition-colors ${dragActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <UploadCloud className="h-10 w-10" />
          </div>

          <h3 className="text-lg font-semibold mb-2">
            {dragActive ? "Drop files here" : "Drag & drop files here"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Supported formats: PDF, Word, Excel, Images (JPEG, PNG). Maximum file size 50MB.
          </p>

          <Input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
          />
          <Button onClick={onButtonClick} variant={dragActive ? "secondary" : "default"}>
            Browse Files
          </Button>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Selected Files <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{files.length}</span>
          </h3>

          <div className="grid gap-3">
            {files.map((file, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="flex items-center p-4 gap-4">
                  <div className="bg-muted p-2 rounded-lg">
                    {getFileIcon(file.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>

                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploading && (
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground opacity-50 shrink-0" />
                  )}
                </div>
              </Card>
            ))}
          </div>

          {uploading && (
            <div className="space-y-2 mt-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2 transition-all duration-300 ease-in-out" />
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              size="lg"
              onClick={handleUpload}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? "Uploading Files..." : "Upload All Files"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-12 space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Previous Uploads</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and view your previously uploaded documents.</p>
        </div>

        {previousUploads.length > 0 ? (
          <div className="grid gap-4">
            {previousUploads.map((upload) => (
              <Card key={upload.id} className="overflow-hidden hover:bg-muted/50 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4">
                  <div className="bg-muted p-3 rounded-xl hidden sm:block">
                    {getFileIcon(upload.type)}
                  </div>

                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="sm:hidden bg-muted p-1.5 rounded-lg">
                        {getFileIcon(upload.type)}
                      </div>
                      <p className="font-semibold text-base truncate">{upload.name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileIcon className="h-3.5 w-3.5" />
                        {formatFileSize(upload.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Uploaded on {upload.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePreviousUpload(upload.id)}
                      className="text-muted-foreground hover:text-destructive gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed h-32 flex items-center justify-center bg-muted/20">
            <p className="text-muted-foreground text-sm">No previous uploads found.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
