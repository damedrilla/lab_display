namespace VerifyFingerprintAPP
{
    partial class Form1
    {
        private System.ComponentModel.IContainer components = null;
        private System.Windows.Forms.Label lblStatus;
        private System.Windows.Forms.PictureBox picFingerprint;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
                components.Dispose();
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            this.lblStatus = new System.Windows.Forms.Label();
            this.picFingerprint = new System.Windows.Forms.PictureBox();
            ((System.ComponentModel.ISupportInitialize)(this.picFingerprint)).BeginInit();
            this.SuspendLayout();

            // 
            // picFingerprint
            // 
            this.picFingerprint.Location = new System.Drawing.Point(0, 20);
            this.picFingerprint.Size = new System.Drawing.Size(200, 250);
            this.picFingerprint.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.picFingerprint.SizeMode = System.Windows.Forms.PictureBoxSizeMode.StretchImage;

            // 
            // lblStatus
            // 
            this.lblStatus.AutoSize = true;
            this.lblStatus.Font = new System.Drawing.Font("Times New Roman", 10F);
            this.lblStatus.Location = new System.Drawing.Point(0, 280);
            this.lblStatus.Size = new System.Drawing.Size(200, 23);
            this.lblStatus.Text = "Waiting for fingerprint...";
            this.lblStatus.ForeColor = System.Drawing.Color.DarkSlateGray;
            this.lblStatus.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;

            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(8F, 20F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(245, 320);
            this.Controls.Add(this.picFingerprint);
            this.Controls.Add(this.lblStatus);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.Name = "Form1";
            this.Text = "🆔";
            ((System.ComponentModel.ISupportInitialize)(this.picFingerprint)).EndInit();
            this.ResumeLayout(false);
            this.PerformLayout();

            this.Resize += (s, e) =>
            {
                picFingerprint.Left = (this.ClientSize.Width - picFingerprint.Width) / 2;
                lblStatus.Left = (this.ClientSize.Width - lblStatus.Width) / 2;
            };
        }
    }
}
