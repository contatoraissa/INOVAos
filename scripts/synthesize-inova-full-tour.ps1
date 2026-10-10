$ErrorActionPreference = 'Stop'
$tourAudioDirectory = Join-Path (Get-Location).Path 'artifacts/inova-full-tour-audio'
New-Item -ItemType Directory -Path $tourAudioDirectory -Force | Out-Null
Add-Type -AssemblyName System.Speech
Add-Type -ReferencedAssemblies System.Speech -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Speech.Synthesis;
using System.Speech.AudioFormat;
public class InovaTourWord {
    public string Text;
    public int Position;
    public double Start;
}
public class InovaTourVoice {
    public static List<InovaTourWord> Generate(string text, string file) {
        var words = new List<InovaTourWord>();
        using (var voice = new SpeechSynthesizer()) {
            voice.SelectVoice("Microsoft Maria Desktop");
            voice.Rate = 1;
            voice.Volume = 100;
            voice.SpeakProgress += delegate(object sender, SpeakProgressEventArgs e) {
                words.Add(new InovaTourWord { Text = e.Text, Position = e.CharacterPosition, Start = e.AudioPosition.TotalSeconds });
            };
            // Match the voice event clock's 16 kHz format to the actual WAV stream.
            voice.SetOutputToWaveFile(file, new SpeechAudioFormatInfo(16000, AudioBitsPerSample.Sixteen, AudioChannel.Mono));
            voice.Speak(text);
            voice.SetOutputToNull();
        }
        return words;
    }
}
'@
$tourScenes = Get-Content -LiteralPath 'artifacts/inova-full-tour-narration.json' -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($tourScene in $tourScenes) {
    $tourAudioFile = Join-Path $tourAudioDirectory ($tourScene.id + '.wav')
    $tourWords = [InovaTourVoice]::Generate(($tourScene.phrases -join ' '), $tourAudioFile)
    ConvertTo-Json -InputObject @($tourWords) -Depth 5 | Set-Content -LiteralPath (Join-Path $tourAudioDirectory ($tourScene.id + '.words.json')) -Encoding UTF8
    Write-Output ($tourScene.id + ': ' + $tourWords.Count + ' timed words')
}
