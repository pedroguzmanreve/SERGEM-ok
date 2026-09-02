import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../../components/FileUpload';

vi.mock('../../services/storage', () => ({
  storageService: {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

describe('FileUpload Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with custom label and instructions', () => {
    render(
      <FileUpload
        bucket="novedades-attachments"
        pathPrefix="novedades/test"
        label="Adjuntar Certificado Médico"
        description="Formatos PDF o JPG hasta 10MB"
        onUploadComplete={vi.fn()}
      />
    );

    expect(screen.getByText('Adjuntar Certificado Médico')).toBeInTheDocument();
    expect(screen.getByText('Formatos PDF o JPG hasta 10MB')).toBeInTheDocument();
  });

  it('shows uploaded file preview and delete button when currentFileUrl is provided', async () => {
    const onRemoveMock = vi.fn();

    render(
      <FileUpload
        bucket="novedades-attachments"
        pathPrefix="novedades/test"
        currentFileUrl="https://example.com/certificado.pdf"
        label="Documento Soporte"
        onUploadComplete={vi.fn()}
        onRemoveFile={onRemoveMock}
      />
    );

    expect(screen.getByText('Archivo adjunto cargado')).toBeInTheDocument();

    const user = userEvent.setup();
    const removeBtn = screen.getByTitle('Eliminar adjunto');
    await user.click(removeBtn);

    expect(onRemoveMock).toHaveBeenCalledTimes(1);
  });
});
