"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, X, Camera, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manipula o clique no botão de upload
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Manipula a captura da imagem pela câmera ou seleção de arquivo
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Criar preview local
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      
      // Preparar o FormData para upload
      const formData = new FormData();
      formData.append("file", file);
      
      // Fazer upload para o servidor
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Falha ao enviar imagem");
      }
      
      const data = await response.json();
      
      // Atualizar o valor com a URL retornada
      onChange(data.url);
      
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      e.target.value = "";
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      // Em caso de erro, limpar o preview
      setPreview(value || null);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Remove a imagem atual
  const handleRemove = () => {
    setPreview(null);
    onChange("");
  };
  
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {preview ? (
        <div className="relative aspect-square w-32 h-32 rounded-md overflow-hidden border">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-7 w-7"
            onClick={handleRemove}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="w-32 h-32 rounded-md border border-dashed flex flex-col items-center justify-center gap-1 bg-muted/30">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Nenhuma imagem</span>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          <Camera className="h-4 w-4" />
          Câmera
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => {
            // Desativa captura da câmera para permitir escolher da galeria
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute("capture");
              fileInputRef.current.click();
              // Restaura o atributo capture após o clique
              setTimeout(() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment");
                }
              }, 1000);
            }
          }}
          disabled={isUploading}
        >
          <ImageIcon className="h-4 w-4" />
          Galeria
        </Button>
      </div>
      
      {isUploading && <p className="text-sm text-muted-foreground">Enviando...</p>}
    </div>
  );
} 