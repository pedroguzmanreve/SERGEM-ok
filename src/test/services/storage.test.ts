import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageService } from '../../services/storage';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('storageService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates public URL correctly for public buckets like driver-audits', async () => {
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/driver-audits/test.jpg' },
    });

    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'test.jpg' },
      error: null,
    });

    (supabase.storage.from as any).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const blob = new Blob(['mock content'], { type: 'image/jpeg' });
    const result = await storageService.uploadFile('driver-audits', 'test.jpg', blob);

    expect(result.error).toBeNull();
    expect(result.url).toBe('https://example.supabase.co/storage/v1/object/public/driver-audits/test.jpg');
    expect(result.path).toBe('test.jpg');
  });

  it('converts base64 data and delegates to uploadFile in uploadBase64', async () => {
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/driver-audits/base64.jpg' },
    });

    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'base64.jpg' },
      error: null,
    });

    (supabase.storage.from as any).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    // Valid small base64 string
    const base64Data = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const result = await storageService.uploadBase64('driver-audits', 'base64.jpg', base64Data);

    expect(result.error).toBeNull();
    expect(result.url).toBe('https://example.supabase.co/storage/v1/object/public/driver-audits/base64.jpg');
  });

  it('handles deleteFile operation properly', async () => {
    const mockRemove = vi.fn().mockResolvedValue({
      data: [{ name: 'test.jpg' }],
      error: null,
    });

    (supabase.storage.from as any).mockReturnValue({
      remove: mockRemove,
    });

    const result = await storageService.deleteFile('novedades-attachments', 'test.jpg');
    expect(result.success).toBe(true);
    expect(mockRemove).toHaveBeenCalledWith(['test.jpg']);
  });
});
