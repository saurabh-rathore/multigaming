import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { WalletView, TransactionView, WalletService } from '../../services/wallet.service'; // Adjusted path
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
})
export class WalletComponent implements OnInit {
  wallet: WalletView | null = null;
  transactions: TransactionView[] = [];

  isLoadingWallet = true;
  isLoadingTransactions = true;
  walletError: string | null = null;
  transactionsError: string | null = null;

  // Conceptual: Get current user's ID from an AuthService or a session service
  private currentUserId = 'currentUser_mock_id';

  private walletService = inject(WalletService); // Angular WalletService

  ngOnInit(): void {
    this.loadWalletData();
  }

  loadWalletData(): void {
    this.isLoadingWallet = true;
    this.isLoadingTransactions = true;
    this.walletError = null;
    this.transactionsError = null;

    const wallet$ = this.walletService.getWallet(this.currentUserId).pipe(
      tap(data => this.wallet = data || null), // Assign null if undefined
      catchError(err => {
        this.walletError = err.message || "Failed to load wallet balance.";
        this.wallet = null; // Ensure wallet is null on error
        return of(null);
      })
    );

    const transactions$ = this.walletService.getTransactions(this.currentUserId, 10).pipe( // Load 10 transactions
      tap(data => this.transactions = data),
      catchError(err => {
        this.transactionsError = err.message || "Failed to load transaction history.";
        this.transactions = []; // Ensure transactions is empty array on error
        return of([]);
      })
    );

    forkJoin([wallet$, transactions$]).subscribe({
      complete: () => {
        this.isLoadingWallet = false;
        this.isLoadingTransactions = false;
        if (!this.wallet && !this.walletError) { // If wallet$ returned null but no error was caught by its catchError
            this.walletError = "Wallet data not found for user.";
        }
      }
    });
  }

  // Placeholder for future actions
  initiateDeposit(): void {
    console.log("Conceptual: Initiate Deposit clicked.");
    // Would navigate to a deposit page or open a modal
  }

  initiateWithdrawal(): void {
    console.log("Conceptual: Initiate Withdrawal clicked.");
    // Would navigate to a withdrawal page or open a modal
  }
}
