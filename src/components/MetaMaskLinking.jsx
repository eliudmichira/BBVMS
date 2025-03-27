import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Check, ChevronDown, HelpCircle, Info, Lock, Shield, Smartphone, User } from 'lucide-react';

const MetaMaskLinking = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [idNumber, setIdNumber] = useState('');
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const verifyID = () => {
    // Simulate ID verification
    setTimeout(() => {
      setIsIdVerified(true);
      setCurrentStep(2);
    }, 1500);
  };
  
  const connectMetaMask = () => {
    setIsConnecting(true);
    // Simulate MetaMask connection
    setTimeout(() => {
      setIsConnected(true);
      setWalletAddress('0x71C...F8A2');
      setCurrentStep(3);
      setIsConnecting(false);
    }, 2000);
  };
  
  const signMessage = () => {
    setIsSigning(true);
    // Simulate message signing
    setTimeout(() => {
      setIsSigned(true);
      setCurrentStep(4);
      setIsSigning(false);
    }, 2000);
  };
  
  const completeProcess = () => {
    // Simulate completion process
    setTimeout(() => {
      setIsComplete(true);
    }, 1500);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/api/placeholder/80/80" alt="IEBC Logo" className="h-16" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">IEBC Blockchain Voting System</h1>
          <p className="text-gray-600">Secure National ID and MetaMask Wallet Linkage</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                {currentStep > 1 ? <Check className="h-6 w-6" /> : 1}
              </div>
              <span className="text-sm mt-2">Verify ID</span>
            </div>
            <div className="flex-1 h-1 mx-2 bg-gray-200">
              <div className={`h-full ${currentStep >= 2 ? 'bg-green-500' : 'bg-gray-200'}`} style={{width: currentStep >= 2 ? '100%' : '0%'}}></div>
            </div>
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                {currentStep > 2 ? <Check className="h-6 w-6" /> : 2}
              </div>
              <span className="text-sm mt-2">Connect Wallet</span>
            </div>
            <div className="flex-1 h-1 mx-2 bg-gray-200">
              <div className={`h-full ${currentStep >= 3 ? 'bg-green-500' : 'bg-gray-200'}`} style={{width: currentStep >= 3 ? '100%' : '0%'}}></div>
            </div>
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                {currentStep > 3 ? <Check className="h-6 w-6" /> : 3}
              </div>
              <span className="text-sm mt-2">Sign Message</span>
            </div>
            <div className="flex-1 h-1 mx-2 bg-gray-200">
              <div className={`h-full ${currentStep >= 4 ? 'bg-green-500' : 'bg-gray-200'}`} style={{width: currentStep >= 4 ? '100%' : '0%'}}></div>
            </div>
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${currentStep >= 4 ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                {isComplete ? <Check className="h-6 w-6" /> : 4}
              </div>
              <span className="text-sm mt-2">Complete</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* Step 1: ID Verification */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 1: Verify Your National ID</h2>
              <p className="text-gray-600 mb-6">Enter your National ID number to verify your identity. This is required to link your MetaMask wallet.</p>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">National ID Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter your ID number"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500">+254</span>
                    <input 
                      type="tel" 
                      className="w-full px-3 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="7XX XXX XXX"
                      required
                    />
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">This information will be verified against the IEBC voter registration database.</p>
                  </div>
                </div>
                
                <button
                  onClick={verifyID}
                  disabled={!idNumber}
                  className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${idNumber ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {isIdVerified ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Verified
                    </>
                  ) : (
                    'Verify National ID'
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Connect MetaMask */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 2: Connect Your MetaMask Wallet</h2>
              <p className="text-gray-600 mb-6">Connect your MetaMask wallet to link it with your National ID. This will be your secure key for voting.</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-amber-800 mb-1">Important: MetaMask Required</h3>
                      <p className="text-sm text-amber-700">MetaMask is required to use the IEBC Blockchain Voting System. This ensures a secure and tamper-proof voting experience.</p>
                      
                      {!isConnected && (
                        <div className="mt-3 flex gap-2">
                          <a href="#" className="text-xs text-blue-600 hover:underline flex items-center">
                            <HelpCircle className="h-3 w-3 mr-1" />
                            What is MetaMask?
                          </a>
                          <a href="#" className="text-xs text-blue-600 hover:underline flex items-center">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Install MetaMask
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <img src="/api/placeholder/40/40" alt="MetaMask" className="h-10 w-10" />
                    <div>
                      <h3 className="font-medium">MetaMask Wallet</h3>
                      <p className="text-sm text-gray-600">Secure blockchain wallet for authentication</p>
                    </div>
                  </div>
                  
                  {!isConnected ? (
                    <button
                      onClick={connectMetaMask}
                      className="w-full mt-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg flex items-center justify-center"
                    >
                      {isConnecting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting to MetaMask...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <img src="/api/placeholder/20/20" alt="MetaMask" className="h-5 w-5 mr-2" />
                          Connect MetaMask
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-1 rounded-full">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800">Wallet Connected</p>
                          <p className="text-xs text-green-700">{walletAddress}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="w-full mt-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600 text-center">This wallet will be permanently linked to your National ID for all future voting. Choose your primary wallet.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Sign Message */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 3: Sign Verification Message</h2>
              <p className="text-gray-600 mb-6">Sign a message with your MetaMask wallet to verify ownership and complete the linking process.</p>
              
              <div className="space-y-4">
                <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-2">Message to Sign</h3>
                  <div className="p-3 bg-white border border-gray-200 rounded-md text-sm font-mono">
                    I confirm that I am linking National ID {idNumber.replace(/\d{4}$/, '****')} to MetaMask wallet {walletAddress} for IEBC Blockchain Voting. This wallet will be required for future voting authentication.
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex gap-3">
                    <Info className="h-6 w-6 text-blue-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-blue-800 mb-1">Why am I signing this message?</h3>
                      <p className="text-sm text-blue-700">Signing proves you own this wallet without sharing your private keys. This cryptographic proof creates a secure link between your National ID and blockchain wallet.</p>
                    </div>
                  </div>
                </div>
                
                {!isSigned ? (
                  <button
                    onClick={signMessage}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center justify-center"
                  >
                    {isSigning ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Waiting for signature...
                      </span>
                    ) : (
                      <span>Sign Message with MetaMask</span>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-1 rounded-full">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-green-800">Message successfully signed</p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="w-full mt-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Step 4: Complete Linkage</h2>
              <p className="text-gray-600 mb-6">Review and confirm the permanent linkage between your National ID and MetaMask wallet.</p>
              
              <div className="space-y-5">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium mb-3">Linkage Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">National ID:</span>
                      <span className="font-medium">{idNumber.replace(/\d{4}$/, '****')}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Wallet Address:</span>
                      <span className="font-medium">{walletAddress}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Verification:</span>
                      <span className="font-medium text-green-600">Cryptographically Signed</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-yellow-800 mb-1">Important: Permanent Linkage</h3>
                      <p className="text-sm text-yellow-700">
                        This will create a permanent link between your National ID and MetaMask wallet. You will be required to use this wallet for all future voting. Changes to this linkage will require in-person verification at an IEBC office.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="flex items-start mb-4">
                    <div className="flex items-center h-5">
                      <input id="terms" name="terms" type="checkbox" className="h-4 w-4 text-green-600 focus:ring-green-500" />
                    </div>
                    <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                      I understand that this wallet will be permanently linked to my National ID for voting purposes
                    </label>
                  </div>
                </div>
                
                {!isComplete ? (
                  <button
                    onClick={completeProcess}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                  >
                    Complete Linkage Process
                  </button>
                ) : (
                  <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-green-800 mb-2">Linkage Successful!</h3>
                    <p className="text-sm text-green-700 mb-4">
                      Your National ID has been securely linked to your MetaMask wallet. You can now use this wallet to authenticate and vote in elections.
                    </p>
                    <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">
                      Go to Voting Portal
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-3">Need Help?</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">IEBC Support</p>
                  <p className="text-sm text-gray-600">0800-123-456</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">MetaMask Help</p>
                  <a href="#" className="text-sm text-blue-600 hover:underline">View Guide</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetaMaskLinking; 