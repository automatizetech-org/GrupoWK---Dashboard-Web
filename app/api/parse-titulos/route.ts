// API route to process PDF files
import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo fornecido' },
        { status: 400 }
      )
    }
    
    // Create temp directory if it doesn't exist
    const tempDir = join(process.cwd(), 'temp')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }
    
    // Save uploaded file to temp directory
    const tempFilePath = join(tempDir, file.name)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempFilePath, buffer)
    
    // Get path to processing script
    const scriptPath = join(process.cwd(), 'parse_titulos.py')
    
    if (!existsSync(scriptPath)) {
      return NextResponse.json(
        { error: 'Sistema de processamento não configurado' },
        { status: 404 }
      )
    }
    
    // Execute processing script
    const outputPath = join(tempDir, `output_${Date.now()}.json`)
    
    // Try python3 first, then python
    let command = `python3 "${scriptPath}" "${tempFilePath}" --format json --output "${outputPath}"`
    
    try {
      // Test if python3 exists
      await execAsync('python3 --version', { timeout: 2000 })
    } catch {
      // Fallback to python
      command = `python "${scriptPath}" "${tempFilePath}" --format json --output "${outputPath}"`
    }
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000, // 60 seconds timeout
    })
    
    if (stderr && !stderr.includes('WARNING')) {
      console.error('Processing stderr:', stderr)
    }
    
    // Read the JSON output
    const { readFile } = await import('fs/promises')
    const jsonContent = await readFile(outputPath, 'utf-8')
    const parsedData = JSON.parse(jsonContent)
    
    // Clean up temp files
    try {
      await unlink(tempFilePath)
      await unlink(outputPath)
    } catch (cleanupError) {
      console.warn('Erro ao limpar arquivos temporários:', cleanupError)
    }
    
    return NextResponse.json({
      success: true,
      data: parsedData,
    })
    
  } catch (error: any) {
    console.error('Erro ao processar PDF:', error)
    
    // Clean up on error
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File
      if (file) {
        const tempDir = join(process.cwd(), 'temp')
        const tempFilePath = join(tempDir, file.name)
        if (existsSync(tempFilePath)) {
          await unlink(tempFilePath)
        }
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar PDF',
        details: error.message || 'Erro desconhecido',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
