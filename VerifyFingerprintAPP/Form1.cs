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

        public void ProcessCapture(Sample sample)
        {
            DisplayFingerprint(sample);

            if (IsVerifying)
            {
                DPFP.FeatureSet features = ExtractFeatures(sample, DPFP.Processing.DataPurpose.Verification);
                if (features != null)
                {
                    bool matched = verification.VerifyFingerprint(features);
                    StopCapture();
                    lblStatus.Text = matched ? "Fingerprint MATCHED!" : "No match found.";
                }
            }
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
            private DPFP.Verification.Verification Verificator;

            public FingerprintVerification()
            {
                Verificator = new DPFP.Verification.Verification();
            }

            public bool VerifyFingerprint(DPFP.FeatureSet features)
            {
                try
                {
                    // REST API URL
                    string apiUrl = "http://localhost:5000/api/fingerprints";

                    // Create an HTTP client
                    using (var client = new HttpClient())
                    {
                        // Send a GET request to the REST API
                        HttpResponseMessage response = client.GetAsync(apiUrl).Result;

                        if (response.IsSuccessStatusCode)
                        {
                            // Parse the JSON response
                            string jsonResponse = response.Content.ReadAsStringAsync().Result;
                            var fingerprints = JsonSerializer.Deserialize<List<Fingerprint>>(jsonResponse);
                            Console.WriteLine($"INFO: Fingerprints fetched: {fingerprints.Count}");

                            foreach (var fingerprint in fingerprints)
                            {
                                // Check if FingerprintTemplate is null or empty
                                if (string.IsNullOrEmpty(fingerprint.FingerprintTemplate))
                                {
                                    Console.WriteLine($"WARNING: Skipping fingerprint with EmployeeNo {fingerprint.EmployeeNo} due to missing template.");
                                    continue;
                                }

                                // Decode the base64-encoded fingerprint template
                                byte[] templateData = Convert.FromBase64String(fingerprint.FingerprintTemplate);

                                // Deserialize the fingerprint template
                                DPFP.Template template = new DPFP.Template();
                                using (MemoryStream ms = new MemoryStream(templateData))
                                {
                                    template.DeSerialize(ms);
                                }

                                // Perform fingerprint verification
                                DPFP.Verification.Verification.Result result = new DPFP.Verification.Verification.Result();
                                Verificator.Verify(features, template, ref result);

                                if (result.Verified)
                                {
                                    Console.WriteLine($"SUCCESS: Fingerprint MATCHED with Employee No: {fingerprint.EmployeeNo}");
                                    Application.Exit(); // Automatically close the app
                                    return true;
                                }
                            }
                        }
                        else
                        {
                            Console.WriteLine($"ERROR: Failed to fetch fingerprints. Status code: {response.StatusCode}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("EXCEPTION: Verification error - " + ex.Message);
                }

                Console.WriteLine("ERROR: No match found.");
                Application.Exit(); // Close even if no match
                return false;
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
