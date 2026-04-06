import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RefreshService {
  private refreshSubject = new Subject<string>();
  refresh$ = this.refreshSubject.asObservable();

  triggerRefresh(feature: string = 'all'): void {
    this.refreshSubject.next(feature);
  }
}
