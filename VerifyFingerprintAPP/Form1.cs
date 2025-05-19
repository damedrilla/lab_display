using System;
using System.IO;
using System.Windows.Forms;
using MySql.Data.MySqlClient;
using DPFP;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization; // Add this namespace

namespace VerifyFingerprintAPP
{
    public partial class Form1 : Form, DPFP.Capture.EventHandler
    {
        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool AllocConsole();

        private DPFP.Capture.Capture? Capturer;
        private FingerprintVerification? verification;
        private bool IsVerifying = true; // Auto-verify
        private List<Fingerprint> cachedFingerprints = null;

        public Form1()
        {
            InitializeComponent();
            AllocConsole(); // Attach a console window
            this.StartPosition = FormStartPosition.CenterScreen;
            Init();
            StartCapture(); // Auto start capture

            // Center controls
            lblStatus.Left = (this.ClientSize.Width - lblStatus.Width) / 2;
            picFingerprint.Left = (this.ClientSize.Width - picFingerprint.Width) / 2;
        }

        private void Init()
        {
            Capturer = new DPFP.Capture.Capture();
            verification = new FingerprintVerification();

            if (Capturer != null)
                Capturer.EventHandler = this;
        }

        private void StartCapture()
        {
            if (Capturer != null)
            {
                try
                {
                    Capturer.StartCapture();
                    lblStatus.Text = "Place your finger on the scanner...";
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Cannot start capture: " + ex.Message);
                }
            }
        }

        private void StopCapture()
        {
            if (Capturer != null)
            {
                try
                {
                    Capturer.StopCapture();
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Cannot stop capture: " + ex.Message);
                }
            }
        }

        public void OnComplete(object Capture, string ReaderSerialNumber, Sample Sample)
        {
            ProcessCapture(Sample);
        }

        public void OnFingerGone(object Capture, string ReaderSerialNumber) { }
        public void OnFingerTouch(object Capture, string ReaderSerialNumber) { }
        public void OnReaderConnect(object Capture, string ReaderSerialNumber) { }
        public void OnReaderDisconnect(object Capture, string ReaderSerialNumber) { }
        public void OnSampleQuality(object Capture, string ReaderSerialNumber, DPFP.Capture.CaptureFeedback Feedback) { }

        public async void ProcessCapture(Sample sample)
        {
            DisplayFingerprint(sample);

            if (IsVerifying)
            {
                DPFP.FeatureSet features = ExtractFeatures(sample, DPFP.Processing.DataPurpose.Verification);
                if (features != null)
                {
                    bool matched = await verification.VerifyFingerprintAsync(features, GetFingerprintsAsync);
                    StopCapture();
                    lblStatus.Text = matched ? "Fingerprint MATCHED!" : "No match found.";
                    if (matched) Application.Exit();
                }
            }
        }

        // Async fetch and cache
        private async Task<List<Fingerprint>> GetFingerprintsAsync()
        {
            if (cachedFingerprints != null)
                return cachedFingerprints;

            string apiUrl = "http://ws-server.local:5000/api/fingerprints";
            using var client = new HttpClient();
            var response = await client.GetAsync(apiUrl);
            if (!response.IsSuccessStatusCode)
                return new List<Fingerprint>();

            string jsonResponse = await response.Content.ReadAsStringAsync();
            cachedFingerprints = JsonSerializer.Deserialize<List<Fingerprint>>(jsonResponse);
            return cachedFingerprints;
        }

        private void DisplayFingerprint(Sample sample)
        {
            DPFP.Capture.SampleConversion converter = new DPFP.Capture.SampleConversion();
            Bitmap bitmap = null;
            converter.ConvertToPicture(sample, ref bitmap);
            if (bitmap != null)
            {
                picFingerprint.Image = new Bitmap(bitmap, picFingerprint.Size);
            }
        }

        private DPFP.FeatureSet? ExtractFeatures(Sample sample, DPFP.Processing.DataPurpose purpose)
        {
            var extractor = new DPFP.Processing.FeatureExtraction();
            var feedback = DPFP.Capture.CaptureFeedback.None;
            var features = new DPFP.FeatureSet();
            extractor.CreateFeatureSet(sample, purpose, ref feedback, ref features);

            return feedback == DPFP.Capture.CaptureFeedback.Good ? features : null;
        }

        // FingerprintVerification class
        public class FingerprintVerification
        {
            private DPFP.Verification.Verification Verificator = new DPFP.Verification.Verification();

            public async Task<bool> VerifyFingerprintAsync(
                DPFP.FeatureSet features,
                Func<Task<List<Fingerprint>>> getFingerprintsAsync)
            {
                try
                {
                    var fingerprints = await getFingerprintsAsync();
                    if (fingerprints == null || fingerprints.Count == 0)
                    {
                        Console.WriteLine("ERROR: No fingerprints found.");
                        return false;
                    }

                    bool matchFound = false;
                    Parallel.ForEach(fingerprints, (fingerprint, state) =>
                    {
                        if (string.IsNullOrEmpty(fingerprint.FingerprintTemplate))
                            return;

                        try
                        {
                            byte[] templateData = Convert.FromBase64String(fingerprint.FingerprintTemplate);
                            var template = new DPFP.Template();
                            using (var ms = new MemoryStream(templateData))
                            {
                                template.DeSerialize(ms);
                            }

                            var result = new DPFP.Verification.Verification.Result();
                            Verificator.Verify(features, template, ref result);

                            if (result.Verified)
                            {
                                Console.WriteLine($"SUCCESS: Fingerprint MATCHED with Employee No: {fingerprint.EmployeeNo}");
                                matchFound = true;
                                state.Stop();
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"EXCEPTION: Error processing fingerprint for EmployeeNo {fingerprint.EmployeeNo} - {ex.Message}");
                        }
                    });

                    if (!matchFound)
                        Console.WriteLine("ERROR: No match found.");

                    return matchFound;
                }
                catch (Exception ex)
                {
                    Console.WriteLine("EXCEPTION: Verification error - " + ex.Message);
                    return false;
                }
            }
        }

        // Define a class to represent the fingerprint data
        public class Fingerprint
        {
            public int Id { get; set; }
            public string EmployeeNo { get; set; }

            [JsonPropertyName("fingerprint_template")] // Map JSON key to property
            public string FingerprintTemplate { get; set; }
        }
    }
}
